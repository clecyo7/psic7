/*
  # Schema Completo - Sistema de Gestão de Consultório
  Execute este arquivo no SQL Editor do Supabase para criar todas as tabelas e configurações necessárias.
  
  Ordem de execução:
  1. Criação das tabelas principais
  2. Correção de políticas
  3. Adição de campos de assinatura
  4. Adição de preço de consulta
  5. Adição de campos de responsável
*/

-- ============================================
-- PARTE 1: CRIAÇÃO DAS TABELAS PRINCIPAIS
-- ============================================

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  birth_date date NOT NULL,
  document text UNIQUE NOT NULL,
  address text NOT NULL,
  emergency_contact text NOT NULL,
  email text NOT NULL,
  education_level text NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('online', 'presencial', 'ambos')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  appointment_date timestamptz NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('online', 'presencial')),
  status text DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation', 'confirmed', 'completed', 'cancelled')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointment_confirmations table
CREATE TABLE IF NOT EXISTS appointment_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  confirmation_sent_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create medical_records table
CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  record_date timestamptz DEFAULT now(),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create consultation_prices table
CREATE TABLE IF NOT EXISTS consultation_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('online', 'presencial')),
  price decimal(10,2) NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create financial_transactions table
CREATE TABLE IF NOT EXISTS financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
  due_date date NOT NULL,
  paid_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 2: POLÍTICAS DE SEGURANÇA (RLS)
-- ============================================

-- Patients policies (versão corrigida - mais flexível)
CREATE POLICY "Authenticated users can view patients"
  ON patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete patients"
  ON patients FOR DELETE
  TO authenticated
  USING (true);

-- Appointments policies
CREATE POLICY "Patients can view their own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can view their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (professional_id = auth.uid());

CREATE POLICY "Professionals can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "Professionals can update their appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "Professionals can delete their appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (professional_id = auth.uid());

-- Appointment confirmations policies
CREATE POLICY "Patients can view confirmations for their appointments"
  ON appointment_confirmations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      JOIN patients ON patients.id = appointments.patient_id
      WHERE appointments.id = appointment_confirmations.appointment_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can view confirmations for their appointments"
  ON appointment_confirmations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = appointment_confirmations.appointment_id
      AND appointments.professional_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can create confirmations"
  ON appointment_confirmations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = appointment_confirmations.appointment_id
      AND appointments.professional_id = auth.uid()
    )
  );

CREATE POLICY "Users can update confirmations for their appointments"
  ON appointment_confirmations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      JOIN patients ON patients.id = appointments.patient_id
      WHERE appointments.id = appointment_confirmations.appointment_id
      AND (patients.user_id = auth.uid() OR appointments.professional_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments
      JOIN patients ON patients.id = appointments.patient_id
      WHERE appointments.id = appointment_confirmations.appointment_id
      AND (patients.user_id = auth.uid() OR appointments.professional_id = auth.uid())
    )
  );

-- Medical records policies
CREATE POLICY "Patients can view their own medical records"
  ON medical_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medical_records.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can view medical records of their patients"
  ON medical_records FOR SELECT
  TO authenticated
  USING (professional_id = auth.uid());

CREATE POLICY "Professionals can create medical records"
  ON medical_records FOR INSERT
  TO authenticated
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "Professionals can update their medical records"
  ON medical_records FOR UPDATE
  TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

-- Consultation prices policies
CREATE POLICY "Professionals can view their own prices"
  ON consultation_prices FOR SELECT
  TO authenticated
  USING (professional_id = auth.uid());

CREATE POLICY "Professionals can create their own prices"
  ON consultation_prices FOR INSERT
  TO authenticated
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "Professionals can update their own prices"
  ON consultation_prices FOR UPDATE
  TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "Professionals can delete their own prices"
  ON consultation_prices FOR DELETE
  TO authenticated
  USING (professional_id = auth.uid());

-- Financial transactions policies
CREATE POLICY "Patients can view their own transactions"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = financial_transactions.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can view their transactions"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (professional_id = auth.uid());

CREATE POLICY "Professionals can create transactions"
  ON financial_transactions FOR INSERT
  TO authenticated
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "Professionals can update their transactions"
  ON financial_transactions FOR UPDATE
  TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

-- ============================================
-- PARTE 3: ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_professional_id ON medical_records(professional_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_professional_id ON financial_transactions(professional_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON financial_transactions(status);

-- ============================================
-- PARTE 4: CAMPOS ADICIONAIS - ASSINATURA DIGITAL
-- ============================================

-- Add signature fields to medical_records table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records' AND column_name = 'signed'
  ) THEN
    ALTER TABLE medical_records ADD COLUMN signed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records' AND column_name = 'signed_at'
  ) THEN
    ALTER TABLE medical_records ADD COLUMN signed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records' AND column_name = 'professional_name'
  ) THEN
    ALTER TABLE medical_records ADD COLUMN professional_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'medical_records' AND column_name = 'professional_registration'
  ) THEN
    ALTER TABLE medical_records ADD COLUMN professional_registration text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_medical_records_signed ON medical_records(signed);
CREATE INDEX IF NOT EXISTS idx_medical_records_signed_at ON medical_records(signed_at);

-- ============================================
-- PARTE 5: PREÇO DE CONSULTA POR PACIENTE
-- ============================================

-- Add consultation_price field to patients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'consultation_price'
  ) THEN
    ALTER TABLE patients ADD COLUMN consultation_price decimal(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add description field to financial_transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_transactions' AND column_name = 'description'
  ) THEN
    ALTER TABLE financial_transactions ADD COLUMN description text DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_patients_consultation_price ON patients(consultation_price);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_due_date ON financial_transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_paid_date ON financial_transactions(paid_date);

-- ============================================
-- PARTE 6: CAMPOS DE RESPONSÁVEL
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'responsible_name'
  ) THEN
    ALTER TABLE patients ADD COLUMN responsible_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'responsible_document'
  ) THEN
    ALTER TABLE patients ADD COLUMN responsible_document text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'responsible_phone'
  ) THEN
    ALTER TABLE patients ADD COLUMN responsible_phone text DEFAULT '';
  END IF;
END $$;

-- ============================================
-- FIM DO SCRIPT
-- ============================================

