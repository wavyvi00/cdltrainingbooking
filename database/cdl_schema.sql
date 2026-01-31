-- CDL Training Booking System - Schema Migration
-- This migration transforms the barbershop booking system to a CDL training platform

-- ============================================================================
-- PHASE 1: Add new enum types and tables (non-destructive)
-- ============================================================================

-- Module types for CDL training
DO $$ BEGIN
    CREATE TYPE module_type AS ENUM ('road', 'backing', 'pretrip');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Session types (private, paired, group)
DO $$ BEGIN
    CREATE TYPE session_type AS ENUM ('private', 'paired', 'group');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- NEW TABLES
-- ============================================================================

-- Training Modules (replaces services for CDL context)
CREATE TABLE IF NOT EXISTS training_modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    module_type module_type NOT NULL,
    duration_min int NOT NULL CHECK (duration_min > 0),
    price_cents int NOT NULL CHECK (price_cents >= 0),
    capacity int NOT NULL DEFAULT 1 CHECK (capacity >= 1),
    min_capacity int NOT NULL DEFAULT 1 CHECK (min_capacity >= 1),
    requires_truck boolean NOT NULL DEFAULT true,
    requires_instructor boolean NOT NULL DEFAULT true,
    active boolean NOT NULL DEFAULT true,
    display_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Trucks/Vehicles for training
CREATE TABLE IF NOT EXISTS trucks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    license_plate text,
    truck_type text DEFAULT 'Class A', -- Class A, Class B, etc.
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Instructors (links to profiles with additional CDL-specific data)
CREATE TABLE IF NOT EXISTS instructors (
    id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    can_teach module_type[] NOT NULL DEFAULT ARRAY['road', 'backing', 'pretrip']::module_type[],
    active boolean NOT NULL DEFAULT true,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Instructor availability (replaces barber availability)
CREATE TABLE IF NOT EXISTS instructor_availability (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id uuid NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time time NOT NULL,
    end_time time NOT NULL,
    CHECK (end_time > start_time),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Student enrollments (required before booking)
CREATE TABLE IF NOT EXISTS enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    program_name text NOT NULL DEFAULT 'CDL Class A',
    enrolled_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz,
    active boolean NOT NULL DEFAULT true,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(student_id, program_name)
);

-- Training sessions (groups multiple bookings into one scheduled block)
CREATE TABLE IF NOT EXISTS training_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id uuid NOT NULL REFERENCES training_modules(id),
    instructor_id uuid REFERENCES instructors(id),
    truck_id uuid REFERENCES trucks(id),
    session_date date NOT NULL,
    start_time time NOT NULL,
    end_time time NOT NULL,
    session_type session_type NOT NULL,
    max_capacity int NOT NULL DEFAULT 1,
    current_capacity int NOT NULL DEFAULT 0,
    is_fixed boolean NOT NULL DEFAULT false, -- True for 8-9 AM pretrip
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'in_progress', 'completed', 'cancelled')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- MODIFY BOOKINGS TABLE
-- ============================================================================

-- Add new columns to bookings (keeping old columns for compatibility)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES training_modules(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES training_sessions(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS instructor_id uuid REFERENCES instructors(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS truck_id uuid REFERENCES trucks(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hours_logged int NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS module_type_enum module_type;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS session_type_enum session_type;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_out_at timestamptz;

-- ============================================================================
-- STUDENT HOUR LOGS (detailed tracking per session)
-- ============================================================================

CREATE TABLE IF NOT EXISTS student_hour_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
    session_id uuid REFERENCES training_sessions(id) ON DELETE SET NULL,
    module_type module_type NOT NULL,
    hours_credited numeric(4,2) NOT NULL CHECK (hours_credited >= 0),
    logged_by uuid NOT NULL REFERENCES profiles(id),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- UPDATE PROFILES TABLE
-- ============================================================================

-- Update role enum to include 'student' and 'instructor'
-- Note: Postgres doesn't allow direct enum modification, so we add values
DO $$ BEGIN
    ALTER TYPE text ADD VALUE IF NOT EXISTS 'student';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Actually, role is stored as text with check constraint, not enum
-- So we need to update the check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('client', 'student', 'instructor', 'admin'));

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_training_sessions_module ON training_sessions(module_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_instructor ON training_sessions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_module ON bookings(module_id);
CREATE INDEX IF NOT EXISTS idx_bookings_session ON bookings(session_id);
CREATE INDEX IF NOT EXISTS idx_bookings_instructor ON bookings(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_availability_day ON instructor_availability(instructor_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_hour_logs_student ON student_hour_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_student_hour_logs_module ON student_hour_logs(module_type);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_hour_logs ENABLE ROW LEVEL SECURITY;

-- Training modules: public read active only
CREATE POLICY "Training modules public read active" ON training_modules
    FOR SELECT USING (active = true);

-- Trucks: admins only
CREATE POLICY "Trucks admin only" ON trucks
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- Instructors: public read, admin write
CREATE POLICY "Instructors public read active" ON instructors
    FOR SELECT USING (active = true);

CREATE POLICY "Instructors admin write" ON instructors
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- Instructor availability: server-only
CREATE POLICY "deny_all_instructor_availability" ON instructor_availability
    FOR ALL USING (false) WITH CHECK (false);

-- Enrollments: own read, admin all
CREATE POLICY "Enrollments read own" ON enrollments
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Enrollments admin all" ON enrollments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- Training sessions: public read, admin write
CREATE POLICY "Training sessions public read" ON training_sessions
    FOR SELECT USING (true);

CREATE POLICY "Training sessions admin write" ON training_sessions
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

CREATE POLICY "Training sessions admin update" ON training_sessions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );

-- Student hour logs: own read, admin/instructor write
CREATE POLICY "Hour logs read own" ON student_hour_logs
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Hour logs admin write" ON student_hour_logs
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'instructor'))
    );

-- ============================================================================
-- SEED DATA: Default Training Modules
-- ============================================================================

INSERT INTO training_modules (name, description, module_type, duration_min, price_cents, capacity, min_capacity, requires_truck, requires_instructor, display_order)
VALUES
    ('Pre-Trip Inspection (8 AM Group)', 
     'Fixed morning group session covering comprehensive pre-trip inspection procedures. Required before road training.', 
     'pretrip', 60, 3000, 8, 1, false, true, 1),
    
    ('Road Training', 
     'Private one-on-one behind-the-wheel road training with certified instructor. Full hour of driving time.', 
     'road', 60, 7000, 1, 1, true, true, 2),
    
    ('Backing Practice', 
     'Paired session for backing maneuvers. Up to 2 students share wheel time with instructor guidance.', 
     'backing', 60, 6000, 2, 1, true, true, 3),
    
    ('Pre-Trip Inspection (Flexible)', 
     'Group pre-trip inspection training. No driving required.', 
     'pretrip', 60, 3000, 8, 1, false, true, 4)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto update updated_at for training_sessions
DROP TRIGGER IF EXISTS trg_training_sessions_updated_at ON training_sessions;
CREATE TRIGGER trg_training_sessions_updated_at
    BEFORE UPDATE ON training_sessions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Function to update session capacity when booking added
CREATE OR REPLACE FUNCTION update_session_capacity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.session_id IS NOT NULL THEN
        UPDATE training_sessions 
        SET current_capacity = current_capacity + 1,
            status = CASE 
                WHEN current_capacity + 1 >= max_capacity THEN 'full'
                ELSE status
            END
        WHERE id = NEW.session_id;
    ELSIF TG_OP = 'DELETE' AND OLD.session_id IS NOT NULL THEN
        UPDATE training_sessions 
        SET current_capacity = GREATEST(current_capacity - 1, 0),
            status = CASE 
                WHEN status = 'full' THEN 'open'
                ELSE status
            END
        WHERE id = OLD.session_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.session_id IS DISTINCT FROM NEW.session_id THEN
        -- Handle session change
        IF OLD.session_id IS NOT NULL THEN
            UPDATE training_sessions 
            SET current_capacity = GREATEST(current_capacity - 1, 0),
                status = CASE WHEN status = 'full' THEN 'open' ELSE status END
            WHERE id = OLD.session_id;
        END IF;
        IF NEW.session_id IS NOT NULL THEN
            UPDATE training_sessions 
            SET current_capacity = current_capacity + 1,
                status = CASE WHEN current_capacity + 1 >= max_capacity THEN 'full' ELSE status END
            WHERE id = NEW.session_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_session_capacity ON bookings;
CREATE TRIGGER trg_booking_session_capacity
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_session_capacity();
