export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'client' | 'barber' | 'admin'
          full_name: string
          phone: string | null
          created_at: string
        }
        Insert: {
          id: string
          role?: 'client' | 'barber' | 'admin'
          full_name: string
          phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'client' | 'barber' | 'admin'
          full_name?: string
          phone?: string | null
          created_at?: string
        }
      }
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
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          client_id: string
          barber_id: string
          service_id: string
          start_datetime: string
          end_datetime: string
          status: 'requested' | 'accepted' | 'declined' | 'countered' | 'cancelled' | 'completed'
          notes: string | null
          counter_start_datetime: string | null
          counter_end_datetime: string | null
          payment_type: 'cash' | 'deposit' | 'full'
          paid_amount_cents: number
          stripe_payment_intent_id: string | null
          stripe_checkout_session_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          barber_id: string
          service_id: string
          start_datetime: string
          end_datetime: string
          status?: 'requested' | 'accepted' | 'declined' | 'countered' | 'cancelled' | 'completed'
          notes?: string | null
          counter_start_datetime?: string | null
          counter_end_datetime?: string | null
          payment_type?: 'cash' | 'deposit' | 'full'
          paid_amount_cents?: number
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          barber_id?: string
          service_id?: string
          start_datetime?: string
          end_datetime?: string
          status?: 'requested' | 'accepted' | 'declined' | 'countered' | 'cancelled' | 'completed'
          notes?: string | null
          counter_start_datetime?: string | null
          counter_end_datetime?: string | null
          payment_type?: 'cash' | 'deposit' | 'full'
          paid_amount_cents?: number
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
