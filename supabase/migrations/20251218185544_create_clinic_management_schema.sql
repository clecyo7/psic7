/*
  # Sistema de Gestão de Consultório

  ## Tabelas Criadas

  ### 1. patients (Pacientes)
  - `id` (uuid, primary key) - Identificador único
  - `user_id` (uuid, foreign key) - Referência ao usuário autenticado
  - `name` (text) - Nome completo
  - `birth_date` (date) - Data de nascimento
  - `document` (text, unique) - CPF/RG
  - `address` (text) - Endereço completo
  - `emergency_contact` (text) - Contato de emergência
  - `email` (text) - E-mail
  - `education_level` (text) - Escolaridade
  - `service_type` (text) - Tipo de atendimento (online/presencial)
  - `created_at` (timestamptz) - Data de criação
  - `updated_at` (timestamptz) - Data de atualização

  ### 2. appointments (Agendamentos)
  - `id` (uuid, primary key) - Identificador único
  - `patient_id` (uuid, foreign key) - Referência ao paciente
  - `professional_id` (uuid, foreign key) - Referência ao profissional
  - `appointment_date` (timestamptz) - Data e hora do agendamento
  - `service_type` (text) - Tipo de atendimento (online/presencial)
  - `status` (text) - Status (pending_confirmation/confirmed/completed/cancelled)
  - `notes` (text) - Observações
  - `created_at` (timestamptz) - Data de criação
  - `updated_at` (timestamptz) - Data de atualização

  ### 3. appointment_confirmations (Confirmações)
  - `id` (uuid, primary key) - Identificador único
  - `appointment_id` (uuid, foreign key) - Referência ao agendamento
  - `confirmation_sent_at` (timestamptz) - Data de envio da confirmação
  - `confirmed_at` (timestamptz) - Data da confirmação
  - `confirmed` (boolean) - Status de confirmação
  - `created_at` (timestamptz) - Data de criação

  ### 4. medical_records (Prontuários)
  - `id` (uuid, primary key) - Identificador único
  - `patient_id` (uuid, foreign key) - Referência ao paciente
  - `appointment_id` (uuid, foreign key) - Referência ao agendamento
  - `professional_id` (uuid, foreign key) - Referência ao profissional
  - `record_date` (timestamptz) - Data do registro
  - `content` (text) - Evolução/conteúdo do prontuário
  - `created_at` (timestamptz) - Data de criação
  - `updated_at` (timestamptz) - Data de atualização

  ### 5. consultation_prices (Preços de Consulta)
  - `id` (uuid, primary key) - Identificador único
  - `professional_id` (uuid, foreign key) - Referência ao profissional
  - `service_type` (text) - Tipo de atendimento
  - `price` (decimal) - Valor da consulta
  - `active` (boolean) - Ativo/Inativo
  - `created_at` (timestamptz) - Data de criação
  - `updated_at` (timestamptz) - Data de atualização

  ### 6. financial_transactions (Transações Financeiras)
  - `id` (uuid, primary key) - Identificador único
  - `appointment_id` (uuid, foreign key) - Referência ao agendamento
  - `patient_id` (uuid, foreign key) - Referência ao paciente
  - `professional_id` (uuid, foreign key) - Referência ao profissional
  - `amount` (decimal) - Valor
  - `status` (text) - Status (pending/received/cancelled)
  - `due_date` (date) - Data de vencimento
  - `paid_date` (date) - Data de pagamento
  - `created_at` (timestamptz) - Data de criação
  - `updated_at` (timestamptz) - Data de atualização

  ## Segurança

  - RLS habilitado em todas as tabelas
  - Políticas para usuários autenticados acessarem apenas seus próprios dados
  - Profissionais podem acessar dados de seus pacientes
*/

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

-- Patients policies
CREATE POLICY "Users can view their own patient profile"
  ON patients FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own patient profile"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own patient profile"
  ON patients FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Professionals can view all patients"
  ON patients FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.patient_id = patients.id
      AND appointments.professional_id = auth.uid()
    )
  );

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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_professional_id ON medical_records(professional_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_professional_id ON financial_transactions(professional_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON financial_transactions(status);