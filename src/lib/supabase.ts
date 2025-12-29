import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      patients: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          birth_date: string;
          document: string;
          address: string;
          emergency_contact: string;
          email: string;
          education_level: string;
          service_type: 'online' | 'presencial' | 'ambos';
          professional_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['patients']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['patients']['Insert']>;
      };
      professionals: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          registration_number: string | null;
          specialization: string | null;
          email: string | null;
          phone: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['professionals']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['professionals']['Insert']>;
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          professional_id: string;
          appointment_date: string;
          service_type: 'online' | 'presencial';
          status: 'pending_confirmation' | 'confirmed' | 'completed' | 'cancelled';
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
      };
      medical_records: {
        Row: {
          id: string;
          patient_id: string;
          appointment_id: string | null;
          professional_id: string;
          record_date: string;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['medical_records']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['medical_records']['Insert']>;
      };
      consultation_prices: {
        Row: {
          id: string;
          professional_id: string;
          service_type: 'online' | 'presencial';
          price: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['consultation_prices']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['consultation_prices']['Insert']>;
      };
      financial_transactions: {
        Row: {
          id: string;
          appointment_id: string | null;
          patient_id: string;
          professional_id: string;
          amount: number;
          status: 'pending' | 'received' | 'cancelled';
          due_date: string;
          paid_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['financial_transactions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['financial_transactions']['Insert']>;
      };
      reports: {
        Row: {
          id: string;
          patient_id: string;
          professional_id: string;
          title: string;
          content: string;
          report_date: string;
          report_type: 'geral' | 'avaliacao' | 'evolucao' | 'alta' | 'outro';
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reports']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['reports']['Insert']>;
      };
    };
  };
};
