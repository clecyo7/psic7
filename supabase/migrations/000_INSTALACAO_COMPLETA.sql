-- ============================================
-- MIGRATION COMPLETA: Instalação do Sistema
-- ============================================
-- Este arquivo contém TODAS as migrações necessárias para o sistema
-- Execute este arquivo no SQL Editor do Supabase para criar todo o banco de dados
-- ============================================

-- ============================================
-- PARTE 1: CRIAR TABELAS BASE
-- ============================================

-- Tabela professionals (deve ser criada primeiro pois patients referencia ela)
CREATE TABLE IF NOT EXISTS professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  registration_number text UNIQUE,
  specialization text,
  email text,
  phone text,
  active boolean DEFAULT true,
  is_super_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela patients (com campos de agendamento recorrente e professional_id)
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES professionals(id) ON DELETE SET NULL,
  name text NOT NULL,
  birth_date date NOT NULL,
  document text UNIQUE NOT NULL,
  address text NOT NULL,
  emergency_contact text NOT NULL,
  email text NOT NULL,
  education_level text NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('online', 'presencial', 'ambos')),
  consultation_price decimal(10,2),
  responsible_name text,
  responsible_document text,
  responsible_phone text,
  appointment_frequency text CHECK (appointment_frequency IN ('semanal', 'quinzenal', NULL)),
  appointment_day_of_week integer CHECK (appointment_day_of_week >= 0 AND appointment_day_of_week <= 6),
  appointment_time time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela appointments (com campos de controle)
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  appointment_date timestamptz NOT NULL,
  appointment_slot timestamptz,
  service_type text NOT NULL CHECK (service_type IN ('online', 'presencial')),
  status text DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation', 'confirmed', 'completed', 'cancelled')),
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  notification_sent boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela appointment_confirmations
CREATE TABLE IF NOT EXISTS appointment_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL UNIQUE,
  confirmation_sent_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Tabela medical_records (com campos de assinatura)
CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  record_date timestamptz DEFAULT now(),
  content text NOT NULL,
  signed boolean DEFAULT false,
  signed_at timestamptz,
  professional_name text,
  professional_registration text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela consultation_prices
CREATE TABLE IF NOT EXISTS consultation_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('online', 'presencial')),
  price decimal(10,2) NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela financial_transactions
CREATE TABLE IF NOT EXISTS financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
  due_date date NOT NULL,
  paid_date date,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  report_type text DEFAULT 'geral' CHECK (report_type IN ('geral', 'avaliacao', 'evolucao', 'alta', 'outro')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- PARTE 2: CRIAR ÍNDICES
-- ============================================

-- Índices para professionals
CREATE INDEX IF NOT EXISTS idx_professionals_user_id ON professionals(user_id);
CREATE INDEX IF NOT EXISTS idx_professionals_active ON professionals(active);
CREATE INDEX IF NOT EXISTS idx_professionals_is_super_admin ON professionals(is_super_admin);

-- Índices para patients
CREATE INDEX IF NOT EXISTS idx_patients_professional_id ON patients(professional_id);

-- Índices para appointments
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_slot 
ON appointments(professional_id, appointment_slot) 
WHERE status NOT IN ('cancelled', 'completed');
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_inactive_future 
ON appointments(professional_id, appointment_date) 
WHERE is_active = false AND status = 'pending_confirmation';
CREATE INDEX IF NOT EXISTS idx_appointments_expiring 
ON appointments(id, expires_at) 
WHERE status = 'pending_confirmation' AND expires_at IS NOT NULL;

-- Índices para medical_records
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_professional_id ON medical_records(professional_id);

-- Índices para financial_transactions
CREATE INDEX IF NOT EXISTS idx_financial_transactions_professional_id ON financial_transactions(professional_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON financial_transactions(status);

-- Índices para reports
CREATE INDEX IF NOT EXISTS idx_reports_patient_id ON reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_reports_professional_id ON reports(professional_id);
CREATE INDEX IF NOT EXISTS idx_reports_report_date ON reports(report_date);

-- ============================================
-- PARTE 3: CRIAR FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar updated_at em patients
CREATE OR REPLACE FUNCTION update_patients_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_patients_updated_at();

-- Função para atualizar updated_at em appointments
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointments_updated_at();

-- Função para atualizar updated_at em medical_records
CREATE OR REPLACE FUNCTION update_medical_records_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_medical_records_updated_at
  BEFORE UPDATE ON medical_records
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_records_updated_at();

-- Função para atualizar updated_at em professionals
CREATE OR REPLACE FUNCTION update_professionals_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_professionals_updated_at
  BEFORE UPDATE ON professionals
  FOR EACH ROW
  EXECUTE FUNCTION update_professionals_updated_at();

-- Função para atualizar updated_at em reports
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

-- Função para atualizar appointment_slot automaticamente
CREATE OR REPLACE FUNCTION update_appointment_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.appointment_slot := date_trunc('minute', NEW.appointment_date);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_appointment_slot
  BEFORE INSERT OR UPDATE OF appointment_date ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_slot();

-- Função para validar conflitos de agenda
CREATE OR REPLACE FUNCTION check_appointment_conflict(
  p_professional_id uuid,
  p_appointment_date timestamptz,
  p_appointment_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  conflict_exists boolean;
  v_appointment_slot timestamptz;
BEGIN
  v_appointment_slot := date_trunc('minute', p_appointment_date);
  
  SELECT EXISTS(
    SELECT 1 
    FROM appointments a
    WHERE a.professional_id = p_professional_id
      AND a.appointment_slot = v_appointment_slot
      AND a.status NOT IN ('cancelled', 'completed')
      AND (p_appointment_id IS NULL OR a.id != p_appointment_id)
  ) INTO conflict_exists;
  
  RETURN NOT conflict_exists;
END;
$$;

-- Trigger para validar conflitos
CREATE OR REPLACE FUNCTION validate_appointment_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status NOT IN ('cancelled', 'completed') THEN
    IF NOT check_appointment_conflict(
      NEW.professional_id, 
      NEW.appointment_date, 
      NEW.id
    ) THEN
      RAISE EXCEPTION 'Conflito de agenda: já existe um agendamento para este profissional neste horário';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validate_appointment_slot
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION validate_appointment_slot();

-- Função para rotina diária de agendamentos
CREATE OR REPLACE FUNCTION activate_daily_appointments()
RETURNS TABLE(
  activated_count integer,
  expired_count integer,
  notifications_sent integer
)
LANGUAGE plpgsql
AS $$
DECLARE
  tomorrow_start timestamptz;
  tomorrow_end timestamptz;
  v_activated integer := 0;
  v_expired integer := 0;
  v_notifications integer := 0;
  appointment_record RECORD;
BEGIN
  tomorrow_start := date_trunc('day', now() + interval '1 day');
  tomorrow_end := tomorrow_start + interval '1 day' - interval '1 second';
  
  FOR appointment_record IN 
    SELECT a.id, a.patient_id, p.email
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE 
      a.is_active = false
      AND a.status = 'pending_confirmation'
      AND a.appointment_date >= tomorrow_start
      AND a.appointment_date <= tomorrow_end
  LOOP
    UPDATE appointments
    SET 
      is_active = true,
      notification_sent = false,
      updated_at = now()
    WHERE id = appointment_record.id;
    
    INSERT INTO appointment_confirmations (appointment_id, confirmed, confirmed_at)
    VALUES (appointment_record.id, false, NULL)
    ON CONFLICT (appointment_id) DO NOTHING;
    
    v_activated := v_activated + 1;
    v_notifications := v_notifications + 1;
  END LOOP;
  
  UPDATE appointments
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE 
    status = 'pending_confirmation'
    AND expires_at IS NOT NULL
    AND expires_at <= now();
  
  GET DIAGNOSTICS v_expired = ROW_COUNT;
  
  RETURN QUERY SELECT v_activated, v_expired, v_notifications;
END;
$$;

-- Função para expirar agendamentos não confirmados
CREATE OR REPLACE FUNCTION expire_unconfirmed_appointments()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE appointments
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE 
    status = 'pending_confirmation'
    AND expires_at IS NOT NULL
    AND expires_at <= now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- Função para verificar se usuário é super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM professionals 
    WHERE user_id = user_uuid 
    AND is_super_admin = true
    AND active = true
  );
END;
$$;

-- ============================================
-- PARTE 4: HABILITAR RLS (Row Level Security)
-- ============================================

ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 5: CRIAR POLÍTICAS RLS
-- ============================================

-- Políticas para PROFESSIONALS
DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os profissionais" ON professionals;
CREATE POLICY "Usuários autenticados podem ver todos os profissionais"
  ON professionals FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) 
    OR active = true
  );

DROP POLICY IF EXISTS "Usuários autenticados podem criar profissionais" ON professionals;
CREATE POLICY "Usuários autenticados podem criar profissionais"
  ON professionals FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR true);

DROP POLICY IF EXISTS "Usuários autenticados podem atualizar profissionais" ON professionals;
CREATE POLICY "Usuários autenticados podem atualizar profissionais"
  ON professionals FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR true)
  WITH CHECK (is_super_admin(auth.uid()) OR true);

DROP POLICY IF EXISTS "Usuários autenticados podem deletar profissionais" ON professionals;
CREATE POLICY "Usuários autenticados podem deletar profissionais"
  ON professionals FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR true);

-- Políticas para PATIENTS
DROP POLICY IF EXISTS "Authenticated users can view patients" ON patients;
CREATE POLICY "Authenticated users can view patients"
  ON patients FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()) OR true);

DROP POLICY IF EXISTS "Authenticated users can create patients" ON patients;
CREATE POLICY "Authenticated users can create patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR true);

DROP POLICY IF EXISTS "Authenticated users can update patients" ON patients;
CREATE POLICY "Authenticated users can update patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR true)
  WITH CHECK (is_super_admin(auth.uid()) OR true);

DROP POLICY IF EXISTS "Authenticated users can delete patients" ON patients;
CREATE POLICY "Authenticated users can delete patients"
  ON patients FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR true);

-- Políticas para APPOINTMENTS
DROP POLICY IF EXISTS "Professionals can view their appointments" ON appointments;
CREATE POLICY "Professionals can view their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()) OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can create appointments" ON appointments;
CREATE POLICY "Professionals can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can update their appointments" ON appointments;
CREATE POLICY "Professionals can update their appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR professional_id = auth.uid())
  WITH CHECK (is_super_admin(auth.uid()) OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can delete their appointments" ON appointments;
CREATE POLICY "Professionals can delete their appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR professional_id = auth.uid());

-- Políticas para APPOINTMENT_CONFIRMATIONS
DROP POLICY IF EXISTS "Users can view confirmations for their appointments" ON appointment_confirmations;
CREATE POLICY "Users can view confirmations for their appointments" ON appointment_confirmations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE appointments.id = appointment_confirmations.appointment_id 
      AND (is_super_admin(auth.uid()) OR appointments.professional_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert confirmations for their appointments" ON appointment_confirmations;
CREATE POLICY "Users can insert confirmations for their appointments" ON appointment_confirmations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE appointments.id = appointment_confirmations.appointment_id 
      AND (is_super_admin(auth.uid()) OR appointments.professional_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update confirmations for their appointments" ON appointment_confirmations;
CREATE POLICY "Users can update confirmations for their appointments" ON appointment_confirmations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE appointments.id = appointment_confirmations.appointment_id 
      AND (is_super_admin(auth.uid()) OR appointments.professional_id = auth.uid())
    )
  );

-- Políticas para MEDICAL_RECORDS
DROP POLICY IF EXISTS "Professionals can view medical records of their patients" ON medical_records;
CREATE POLICY "Professionals can view medical records of their patients"
  ON medical_records FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()) OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can create medical records" ON medical_records;
CREATE POLICY "Professionals can create medical records"
  ON medical_records FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can update their medical records" ON medical_records;
CREATE POLICY "Professionals can update their medical records"
  ON medical_records FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR professional_id = auth.uid())
  WITH CHECK (is_super_admin(auth.uid()) OR professional_id = auth.uid());

-- Políticas para CONSULTATION_PRICES
DROP POLICY IF EXISTS "Users can manage their own prices" ON consultation_prices;
CREATE POLICY "Users can manage their own prices" ON consultation_prices
  FOR ALL USING (is_super_admin(auth.uid()) OR auth.uid() = professional_id);

-- Políticas para FINANCIAL_TRANSACTIONS
DROP POLICY IF EXISTS "Professionals can view their transactions" ON financial_transactions;
CREATE POLICY "Professionals can view their transactions"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()) OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can create transactions" ON financial_transactions;
CREATE POLICY "Professionals can create transactions"
  ON financial_transactions FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can update their transactions" ON financial_transactions;
CREATE POLICY "Professionals can update their transactions"
  ON financial_transactions FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR professional_id = auth.uid())
  WITH CHECK (is_super_admin(auth.uid()) OR professional_id = auth.uid());

-- Políticas para REPORTS
DROP POLICY IF EXISTS "Profissionais podem ver seus próprios relatórios" ON reports;
CREATE POLICY "Profissionais podem ver seus próprios relatórios"
  ON reports FOR SELECT
  USING (is_super_admin(auth.uid()) OR auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais podem criar relatórios" ON reports;
CREATE POLICY "Profissionais podem criar relatórios"
  ON reports FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()) OR auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais podem atualizar seus próprios relatórios" ON reports;
CREATE POLICY "Profissionais podem atualizar seus próprios relatórios"
  ON reports FOR UPDATE
  USING (is_super_admin(auth.uid()) OR auth.uid() = professional_id)
  WITH CHECK (is_super_admin(auth.uid()) OR auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais podem deletar seus próprios relatórios" ON reports;
CREATE POLICY "Profissionais podem deletar seus próprios relatórios"
  ON reports FOR DELETE
  USING (is_super_admin(auth.uid()) OR auth.uid() = professional_id);

-- ============================================
-- FIM DA MIGRATION
-- ============================================
-- Sistema completo instalado!
-- ============================================

