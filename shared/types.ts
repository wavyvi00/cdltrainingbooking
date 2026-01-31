// CDL Training Booking System - TypeScript Types
// Auto-generated to match database/cdl_schema.sql

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum types
export type ModuleType = 'road' | 'backing' | 'pretrip'
export type SessionType = 'private' | 'paired' | 'group'
export type ProfileRole = 'client' | 'student' | 'instructor' | 'admin'
export type BookingStatus = 'requested' | 'accepted' | 'declined' | 'countered' | 'cancelled' | 'completed' | 'confirmed' | 'arrived' | 'no_show'
export type PaymentMethod = 'card' | 'cash'
export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'cash_pending' | 'cash_paid' | 'cancelled' | 'no_show_charged' | 'refunded'
export type TrainingSessionStatus = 'open' | 'full' | 'in_progress' | 'completed' | 'cancelled'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: ProfileRole
          full_name: string
          phone: string | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role?: ProfileRole
          full_name: string
          phone?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: ProfileRole
          full_name?: string
          phone?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
      }

      training_modules: {
        Row: {
          id: string
          name: string
          description: string | null
          module_type: ModuleType
          duration_min: number
          price_cents: number
          capacity: number
          min_capacity: number
          requires_truck: boolean
          requires_instructor: boolean
          active: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          module_type: ModuleType
          duration_min: number
          price_cents: number
          capacity?: number
          min_capacity?: number
          requires_truck?: boolean
          requires_instructor?: boolean
          active?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          module_type?: ModuleType
          duration_min?: number
          price_cents?: number
          capacity?: number
          min_capacity?: number
          requires_truck?: boolean
          requires_instructor?: boolean
          active?: boolean
          display_order?: number
        }
      }

      trucks: {
        Row: {
          id: string
          name: string
          description: string | null
          license_plate: string | null
          truck_type: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          license_plate?: string | null
          truck_type?: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          license_plate?: string | null
          truck_type?: string
          active?: boolean
        }
      }

      instructors: {
        Row: {
          id: string
          can_teach: ModuleType[]
          active: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id: string // Must match a profile ID
          can_teach?: ModuleType[]
          active?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          can_teach?: ModuleType[]
          active?: boolean
          notes?: string | null
        }
      }

      instructor_availability: {
        Row: {
          id: string
          instructor_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at: string
        }
        Insert: {
          id?: string
          instructor_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at?: string
        }
        Update: {
          instructor_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
        }
      }

      enrollments: {
        Row: {
          id: string
          student_id: string
          program_name: string
          enrolled_at: string
          expires_at: string | null
          active: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          program_name?: string
          enrolled_at?: string
          expires_at?: string | null
          active?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          program_name?: string
          expires_at?: string | null
          active?: boolean
          notes?: string | null
        }
      }

      training_sessions: {
        Row: {
          id: string
          module_id: string
          instructor_id: string | null
          truck_id: string | null
          session_date: string
          start_time: string
          end_time: string
          session_type: SessionType
          max_capacity: number
          current_capacity: number
          is_fixed: boolean
          status: TrainingSessionStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          module_id: string
          instructor_id?: string | null
          truck_id?: string | null
          session_date: string
          start_time: string
          end_time: string
          session_type: SessionType
          max_capacity?: number
          current_capacity?: number
          is_fixed?: boolean
          status?: TrainingSessionStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          module_id?: string
          instructor_id?: string | null
          truck_id?: string | null
          session_date?: string
          start_time?: string
          end_time?: string
          session_type?: SessionType
          max_capacity?: number
          current_capacity?: number
          is_fixed?: boolean
          status?: TrainingSessionStatus
          notes?: string | null
          updated_at?: string
        }
      }

      bookings: {
        Row: {
          id: string
          client_id: string
          // Legacy fields (kept for compatibility)
          barber_id: string | null
          service_id: string | null
          // CDL Training fields
          module_id: string | null
          session_id: string | null
          instructor_id: string | null
          truck_id: string | null
          module_type_enum: ModuleType | null
          session_type_enum: SessionType | null
          hours_logged: number
          checked_in_at: string | null
          checked_out_at: string | null
          // Time fields
          start_datetime: string
          end_datetime: string
          // Status
          status: BookingStatus
          notes: string | null
          counter_start_datetime: string | null
          counter_end_datetime: string | null
          // Payment fields
          payment_type: 'cash' | 'deposit' | 'full'
          payment_method: PaymentMethod
          paid_amount_cents: number
          amount_cents: number | null
          payment_status: PaymentStatus | null
          stripe_payment_intent_id: string | null
          payment_intent_id: string | null
          setup_intent_id: string | null
          payment_method_id: string | null
          stripe_checkout_session_id: string | null
          // Timestamps
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          barber_id?: string | null
          service_id?: string | null
          module_id?: string | null
          session_id?: string | null
          instructor_id?: string | null
          truck_id?: string | null
          module_type_enum?: ModuleType | null
          session_type_enum?: SessionType | null
          hours_logged?: number
          checked_in_at?: string | null
          checked_out_at?: string | null
          start_datetime: string
          end_datetime: string
          status?: BookingStatus
          notes?: string | null
          counter_start_datetime?: string | null
          counter_end_datetime?: string | null
          payment_type?: 'cash' | 'deposit' | 'full'
          payment_method?: PaymentMethod
          paid_amount_cents?: number
          amount_cents?: number | null
          payment_status?: PaymentStatus
          stripe_payment_intent_id?: string | null
          payment_intent_id?: string | null
          setup_intent_id?: string | null
          payment_method_id?: string | null
          stripe_checkout_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          barber_id?: string | null
          service_id?: string | null
          module_id?: string | null
          session_id?: string | null
          instructor_id?: string | null
          truck_id?: string | null
          module_type_enum?: ModuleType | null
          session_type_enum?: SessionType | null
          hours_logged?: number
          checked_in_at?: string | null
          checked_out_at?: string | null
          start_datetime?: string
          end_datetime?: string
          status?: BookingStatus
          notes?: string | null
          counter_start_datetime?: string | null
          counter_end_datetime?: string | null
          payment_type?: 'cash' | 'deposit' | 'full'
          payment_method?: PaymentMethod
          paid_amount_cents?: number
          amount_cents?: number | null
          payment_status?: PaymentStatus
          stripe_payment_intent_id?: string | null
          payment_intent_id?: string | null
          setup_intent_id?: string | null
          payment_method_id?: string | null
          stripe_checkout_session_id?: string | null
          updated_at?: string
        }
      }

      student_hour_logs: {
        Row: {
          id: string
          student_id: string
          booking_id: string | null
          session_id: string | null
          module_type: ModuleType
          hours_credited: number
          logged_by: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          booking_id?: string | null
          session_id?: string | null
          module_type: ModuleType
          hours_credited: number
          logged_by: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          student_id?: string
          booking_id?: string | null
          session_id?: string | null
          module_type?: ModuleType
          hours_credited?: number
          logged_by?: string
          notes?: string | null
        }
      }

      // Legacy tables (kept for compatibility)
      services: {
        Row: {
          id: string
          name: string
          description: string | null
          duration_min: number
          price_cents: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          duration_min: number
          price_cents: number
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          duration_min?: number
          price_cents?: number
          active?: boolean
        }
      }

      availability_rules: {
        Row: {
          id: string
          barber_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at: string
        }
        Insert: {
          id?: string
          barber_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at?: string
        }
        Update: {
          barber_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
        }
      }

      time_off: {
        Row: {
          id: string
          barber_id: string
          start_datetime: string
          end_datetime: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          barber_id: string
          start_datetime: string
          end_datetime: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          barber_id?: string
          start_datetime?: string
          end_datetime?: string
          reason?: string | null
        }
      }
    }
  }
}

// Convenience types for common use cases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type TrainingModule = Database['public']['Tables']['training_modules']['Row']
export type Truck = Database['public']['Tables']['trucks']['Row']
export type Instructor = Database['public']['Tables']['instructors']['Row']
export type InstructorAvailability = Database['public']['Tables']['instructor_availability']['Row']
export type Enrollment = Database['public']['Tables']['enrollments']['Row']
export type TrainingSession = Database['public']['Tables']['training_sessions']['Row']
export type Booking = Database['public']['Tables']['bookings']['Row']
export type StudentHourLog = Database['public']['Tables']['student_hour_logs']['Row']

// Joined types for API responses
export type InstructorWithProfile = Instructor & {
  profiles: Pick<Profile, 'full_name' | 'phone'>
}

export type TrainingSessionWithDetails = TrainingSession & {
  training_modules: Pick<TrainingModule, 'name' | 'module_type' | 'price_cents'>
  instructors?: InstructorWithProfile | null
  trucks?: Pick<Truck, 'name' | 'license_plate'> | null
}

export type BookingWithDetails = Booking & {
  training_modules?: Pick<TrainingModule, 'name' | 'module_type' | 'price_cents'> | null
  training_sessions?: TrainingSessionWithDetails | null
  profiles?: Pick<Profile, 'full_name' | 'phone'> | null
}

export type StudentHoursTotal = {
  student_id: string
  module_type: ModuleType
  total_hours: number
}
