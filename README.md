# Florida CDL Training Booking System

A modern booking platform for CDL (Commercial Driver's License) training sessions. Built with Next.js 14, Supabase, and Stripe.

## 🚀 Features

### Training Modules
| Module | Type | Duration | Price | Capacity |
|--------|------|----------|-------|----------|
| Pre-Trip Inspection (8 AM) | Group | 1 hr | $30 | 6-8 students |
| Road Training | Private | 1 hr | $70 | 1 student |
| Backing Practice | Paired | 1 hr | $60 | 2 students |
| Pre-Trip (Flexible) | Group | 1 hr | $30 | 6-8 students |

### Key Features
- **Weekend-Only Training** - Sessions available Saturday & Sunday
- **Session-Based Booking** - Join existing sessions or create new ones
- **Fixed 8 AM Pre-Trip** - Required group session every training day
- **Resource Management** - Instructor + truck availability constraints
- **Enrollment Validation** - Students must be enrolled to book
- **Stripe Payments** - Card-on-file with no-show charging
- **Admin Dashboard** - Manage sessions, instructors, and hour logging

## 📁 Project Structure

```
├── frontend/          # Next.js 14 web app
│   ├── app/
│   │   ├── api/       # API routes
│   │   │   ├── sessions/     # CDL session APIs (NEW)
│   │   │   ├── bookings/     # Booking management
│   │   │   └── admin/        # Admin endpoints
│   │   ├── admin/     # Admin dashboard pages
│   │   └── book/      # Booking flow pages
│   ├── components/    # React components
│   └── lib/           # Utilities (Stripe, Supabase)
├── mobile/            # React Native app
├── supabase/          # Edge Functions
├── database/          # SQL schemas
│   ├── schema.sql     # Original schema
│   └── cdl_schema.sql # CDL training schema (NEW)
├── shared/            # Shared TypeScript types
└── docs/              # Documentation
    └── IMPLEMENTATION_PLAN.md
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Payments**: Stripe (PaymentIntents, SetupIntents, No-show charging)
- **Mobile**: React Native / Expo

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/wavyvi00/cdltrainingbooking.git
cd cdltrainingbooking
```

2. Install dependencies:
```bash
cd frontend
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase and Stripe keys
```

4. Run the development server:
```bash
npm run dev
```

## 📖 Documentation

See [docs/IMPLEMENTATION_PLAN.md](./docs/IMPLEMENTATION_PLAN.md) for:
- Architecture overview
- Component analysis
- Data model design
- Stripe integration details
- Business rules implementation
- Phased development approach

## 🗄️ Database Setup

Apply the CDL training schema:
```bash
# Via Supabase Dashboard SQL Editor
# Run contents of database/cdl_schema.sql
```

## 📋 API Endpoints

### CDL Sessions (New)
- `GET /api/sessions?date=YYYY-MM-DD` - Get available sessions for a date
- `POST /api/sessions/book` - Book into a session
- `GET /api/sessions/dates` - Get available training dates (weekends)

### Legacy (From RoyCuts)
- `GET /api/availability` - Get available time slots
- `POST /api/bookings` - Create a booking
- `GET /api/admin/bookings` - Admin: list bookings

## 📊 Development Progress

- [x] Phase 1: Data Model Design
- [x] Phase 2: Calendar & Availability Engine
- [ ] Phase 3: Booking Flow UI
- [ ] Phase 4: Admin & Hour Logging
- [ ] Phase 5: Branding & Polish

## 📄 License

Private - Florida CDL School
