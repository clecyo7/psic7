-- ============================================
-- MIGRATION COMPLETA: RESET E RECRIAÇÃO DO ZERO
-- ============================================
-- ATENÇÃO: Esta migration vai DELETAR TODOS OS DADOS e recriar tudo do zero
-- Execute apenas se quiser começar do zero ou se estiver em desenvolvimento
-- ============================================

-- Desabilitar triggers temporariamente
SET session_replication_role = 'replica';

-- ============================================
-- PARTE 1: REMOVER TUDO (em ordem correta)
-- ============================================

-- Remover triggers
DROP TRIGGER IF EXISTS trigger_validate_appointment_slot ON appointments;
DROP TRIGGER IF EXISTS trigger_update_appointment_slot ON appointments;

-- Remover funções
DROP FUNCTION IF EXISTS check_appointment_conflict(uuid, timestamptz, uuid);
DROP FUNCTION IF EXISTS validate_appointment_slot();
DROP FUNCTION IF EXISTS update_appointment_slot();
DROP FUNCTION IF EXISTS activate_daily_appointments();
DROP FUNCTION IF EXISTS expire_unconfirmed_appointments();

-- Remover índices
DROP INDEX IF EXISTS idx_appointments_unique_slot;
DROP INDEX IF EXISTS idx_appointments_inactive_future;
DROP INDEX IF EXISTS idx_appointments_expiring;
DROP INDEX IF EXISTS idx_appointments_patient_id;
DROP INDEX IF EXISTS idx_appointments_professional_id;
DROP INDEX IF EXISTS idx_appointments_date;
DROP INDEX IF EXISTS idx_appointments_status;
DROP INDEX IF EXISTS idx_medical_records_patient_id;
DROP INDEX IF EXISTS idx_medical_records_professional_id;
DROP INDEX IF EXISTS idx_financial_transactions_professional_id;
DROP INDEX IF EXISTS idx_financial_transactions_status;

-- Remover tabelas (em ordem devido a foreign keys)
DROP TABLE IF EXISTS appointment_confirmations CASCADE;
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS consultation_prices CASCADE;
DROP TABLE IF EXISTS patients CASCADE;

-- Reabilitar triggers
SET session_replication_role = 'origin';

-- ============================================
-- PARTE 2: CRIAR TABELAS
-- ============================================

-- Tabela patients (com campos de agendamento recorrente)
CREATE TABLE patients (
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
  consultation_price decimal(10,2),
  responsible_name text,
  responsible_document text,
  responsible_phone text,
  -- Campos de agendamento recorrente
  appointment_frequency text CHECK (appointment_frequency IN ('semanal', 'quinzenal', NULL)),
  appointment_day_of_week integer CHECK (appointment_day_of_week >= 0 AND appointment_day_of_week <= 6),
  appointment_time time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela appointments (com campos de controle)
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  appointment_date timestamptz NOT NULL,
  appointment_slot timestamptz, -- Slot arredondado para minuto (para índice único)
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
CREATE TABLE appointment_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL UNIQUE,
  confirmation_sent_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Tabela medical_records
CREATE TABLE medical_records (
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
CREATE TABLE consultation_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('online', 'presencial')),
  price decimal(10,2) NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela financial_transactions
CREATE TABLE financial_transactions (
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

-- ============================================
-- PARTE 3: CRIAR TRIGGERS E FUNÇÕES
-- ============================================

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

-- Função para rotina diária
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

-- Função para expirar agendamentos
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

-- ============================================
-- PARTE 4: CRIAR ÍNDICES
-- ============================================

-- Índice único para prevenir conflitos
CREATE UNIQUE INDEX idx_appointments_unique_slot 
ON appointments(professional_id, appointment_slot) 
WHERE status NOT IN ('cancelled', 'completed');

-- Índices para performance
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_professional_id ON appointments(professional_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_inactive_future 
ON appointments(professional_id, appointment_date) 
WHERE is_active = false AND status = 'pending_confirmation';
CREATE INDEX idx_appointments_expiring 
ON appointments(id, expires_at) 
WHERE status = 'pending_confirmation' AND expires_at IS NOT NULL;

CREATE INDEX idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX idx_medical_records_professional_id ON medical_records(professional_id);
CREATE INDEX idx_financial_transactions_professional_id ON financial_transactions(professional_id);
CREATE INDEX idx_financial_transactions_status ON financial_transactions(status);

-- ============================================
-- PARTE 5: HABILITAR RLS (Row Level Security)
-- ============================================

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 6: CRIAR POLÍTICAS RLS
-- ============================================

-- Políticas para patients
DROP POLICY IF EXISTS "Users can view their own patients" ON patients;
CREATE POLICY "Users can view their own patients" ON patients
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own patients" ON patients;
CREATE POLICY "Users can insert their own patients" ON patients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own patients" ON patients;
CREATE POLICY "Users can update their own patients" ON patients
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own patients" ON patients;
CREATE POLICY "Users can delete their own patients" ON patients
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para appointments
DROP POLICY IF EXISTS "Users can view their own appointments" ON appointments;
CREATE POLICY "Users can view their own appointments" ON appointments
  FOR SELECT USING (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Users can insert their own appointments" ON appointments;
CREATE POLICY "Users can insert their own appointments" ON appointments
  FOR INSERT WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Users can update their own appointments" ON appointments;
CREATE POLICY "Users can update their own appointments" ON appointments
  FOR UPDATE USING (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Users can delete their own appointments" ON appointments;
CREATE POLICY "Users can delete their own appointments" ON appointments
  FOR DELETE USING (auth.uid() = professional_id);

-- Políticas para appointment_confirmations
DROP POLICY IF EXISTS "Users can view confirmations for their appointments" ON appointment_confirmations;
CREATE POLICY "Users can view confirmations for their appointments" ON appointment_confirmations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE appointments.id = appointment_confirmations.appointment_id 
      AND appointments.professional_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert confirmations for their appointments" ON appointment_confirmations;
CREATE POLICY "Users can insert confirmations for their appointments" ON appointment_confirmations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE appointments.id = appointment_confirmations.appointment_id 
      AND appointments.professional_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update confirmations for their appointments" ON appointment_confirmations;
CREATE POLICY "Users can update confirmations for their appointments" ON appointment_confirmations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM appointments 
      WHERE appointments.id = appointment_confirmations.appointment_id 
      AND appointments.professional_id = auth.uid()
    )
  );

-- Políticas para medical_records
DROP POLICY IF EXISTS "Users can view their own medical records" ON medical_records;
CREATE POLICY "Users can view their own medical records" ON medical_records
  FOR SELECT USING (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Users can insert their own medical records" ON medical_records;
CREATE POLICY "Users can insert their own medical records" ON medical_records
  FOR INSERT WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Users can update their own medical records" ON medical_records;
CREATE POLICY "Users can update their own medical records" ON medical_records
  FOR UPDATE USING (auth.uid() = professional_id);

-- Políticas para consultation_prices
DROP POLICY IF EXISTS "Users can manage their own prices" ON consultation_prices;
CREATE POLICY "Users can manage their own prices" ON consultation_prices
  FOR ALL USING (auth.uid() = professional_id);

-- Políticas para financial_transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON financial_transactions;
CREATE POLICY "Users can view their own transactions" ON financial_transactions
  FOR SELECT USING (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON financial_transactions;
CREATE POLICY "Users can insert their own transactions" ON financial_transactions
  FOR INSERT WITH CHECK (auth.uid() = professional_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON financial_transactions;
CREATE POLICY "Users can update their own transactions" ON financial_transactions
  FOR UPDATE USING (auth.uid() = professional_id);

-- ============================================
-- PARTE 7: COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================

COMMENT ON TABLE patients IS 'Tabela de pacientes com suporte a agendamento recorrente';
COMMENT ON COLUMN patients.appointment_frequency IS 'Frequência do agendamento: semanal ou quinzenal';
COMMENT ON COLUMN patients.appointment_day_of_week IS 'Dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)';
COMMENT ON COLUMN patients.appointment_time IS 'Horário fixo da consulta';

COMMENT ON TABLE appointments IS 'Tabela de agendamentos com controle de conflitos e expiração';
COMMENT ON COLUMN appointments.appointment_slot IS 'Slot de horário arredondado para minuto (usado para prevenir conflitos)';
COMMENT ON COLUMN appointments.is_active IS 'Indica se o agendamento está ativo (true) ou inativo/agendado para futuro (false)';
COMMENT ON COLUMN appointments.expires_at IS 'Data/hora de expiração do pré-agendamento se não confirmado';
COMMENT ON COLUMN appointments.notification_sent IS 'Indica se a notificação foi enviada';

COMMENT ON FUNCTION check_appointment_conflict IS 'Valida se há conflito de agenda antes de inserir/atualizar agendamento';
COMMENT ON FUNCTION validate_appointment_slot IS 'Trigger que valida conflitos de agenda automaticamente';
COMMENT ON FUNCTION activate_daily_appointments IS 'Rotina diária: ativa pré-agendamentos para D+1 e expira os não confirmados';
COMMENT ON FUNCTION expire_unconfirmed_appointments IS 'Expira pré-agendamentos não confirmados que passaram do prazo';

-- ============================================
-- FIM DA MIGRATION
-- ============================================
-- Tudo foi recriado do zero com a estrutura completa!
-- ============================================

