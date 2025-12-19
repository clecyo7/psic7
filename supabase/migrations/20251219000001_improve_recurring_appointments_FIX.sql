-- Migration: Melhorias para agendamentos recorrentes (VERSÃO CORRIGIDA)
-- Data: 2024-12-19
-- Descrição: Adiciona campos de controle, índices únicos e funções para rotina diária

-- Adicionar campos de controle nos agendamentos
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS appointment_slot timestamptz,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS expires_at timestamptz,
ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false;

-- Atualizar appointment_slot para agendamentos existentes (arredondar para minuto)
-- IMPORTANTE: A coluna já foi criada acima, então podemos atualizar
UPDATE appointments
SET appointment_slot = date_trunc('minute', appointment_date)
WHERE appointment_slot IS NULL;

-- REMOVER DUPLICADOS antes de criar o índice único
-- Manter apenas o agendamento mais recente quando houver duplicados
-- Usar date_trunc diretamente já que appointment_slot pode ainda estar NULL em alguns registros
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY professional_id, date_trunc('minute', appointment_date)
      ORDER BY 
        CASE 
          WHEN status = 'confirmed' THEN 1
          WHEN status = 'pending_confirmation' THEN 2
          ELSE 3
        END,
        created_at DESC
    ) as row_num
  FROM appointments
  WHERE status NOT IN ('cancelled', 'completed')
)
UPDATE appointments
SET 
  status = 'cancelled',
  updated_at = now(),
  notes = COALESCE(notes, '') || ' [Cancelado: duplicado removido]'
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Atualizar appointment_slot novamente após limpeza
UPDATE appointments
SET appointment_slot = date_trunc('minute', appointment_date)
WHERE appointment_slot IS NULL;

-- Criar trigger para manter appointment_slot atualizado
CREATE OR REPLACE FUNCTION update_appointment_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.appointment_slot := date_trunc('minute', NEW.appointment_date);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_appointment_slot ON appointments;
CREATE TRIGGER trigger_update_appointment_slot
  BEFORE INSERT OR UPDATE OF appointment_date ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_slot();

-- Criar índice único para prevenir conflitos de agenda
-- Usando appointment_slot que é uma coluna normal (não função)
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_slot 
ON appointments(professional_id, appointment_slot) 
WHERE status NOT IN ('cancelled', 'completed');

-- Comentários
COMMENT ON COLUMN appointments.is_active IS 'Indica se o agendamento está ativo (true) ou inativo/agendado para futuro (false)';
COMMENT ON COLUMN appointments.expires_at IS 'Data/hora de expiração do pré-agendamento se não confirmado';
COMMENT ON COLUMN appointments.notification_sent IS 'Indica se a notificação foi enviada';
COMMENT ON COLUMN appointments.appointment_slot IS 'Slot de horário arredondado para minuto (usado para prevenir conflitos)';

-- Criar índice para agendamentos inativos que precisam ser ativados
CREATE INDEX IF NOT EXISTS idx_appointments_inactive_future 
ON appointments(professional_id, appointment_date) 
WHERE is_active = false AND status = 'pending_confirmation';

-- Criar índice para pré-agendamentos que expiram
-- Não podemos usar now() no índice, então criamos um índice simples
-- A verificação de expiração será feita nas queries
CREATE INDEX IF NOT EXISTS idx_appointments_expiring 
ON appointments(id, expires_at) 
WHERE status = 'pending_confirmation' AND expires_at IS NOT NULL;

-- Função para validar conflitos de agenda antes de inserir/atualizar
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
  -- Calcular o slot (arredondado para minuto)
  v_appointment_slot := date_trunc('minute', p_appointment_date);
  
  -- Verificar se existe conflito
  -- Qualificar a coluna da tabela para evitar ambiguidade
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

-- Trigger para validar conflitos antes de inserir/atualizar
CREATE OR REPLACE FUNCTION validate_appointment_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verificar conflito apenas para status que ocupam agenda
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

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_validate_appointment_slot ON appointments;
CREATE TRIGGER trigger_validate_appointment_slot
  BEFORE INSERT OR UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION validate_appointment_slot();

-- Função para rotina diária: ativar pré-agendamentos em D-1
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
  -- Calcular início e fim de amanhã
  tomorrow_start := date_trunc('day', now() + interval '1 day');
  tomorrow_end := tomorrow_start + interval '1 day' - interval '1 second';
  
  -- Ativar agendamentos inativos para amanhã e criar confirmações
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
    -- Ativar o agendamento
    UPDATE appointments
    SET 
      is_active = true,
      notification_sent = false,
      updated_at = now()
    WHERE id = appointment_record.id;
    
    -- Criar confirmação se não existir
    INSERT INTO appointment_confirmations (appointment_id, confirmed, confirmed_at)
    VALUES (appointment_record.id, false, NULL)
    ON CONFLICT (appointment_id) DO NOTHING;
    
    v_activated := v_activated + 1;
    v_notifications := v_notifications + 1;
    
    -- TODO: Aqui você pode chamar uma função para enviar notificação
    -- Por exemplo: PERFORM send_appointment_notification(appointment_record.id, appointment_record.email);
  END LOOP;
  
  -- Expirar pré-agendamentos não confirmados que passaram do prazo
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

-- Função para expirar pré-agendamentos não confirmados
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

-- Comentários nas funções
COMMENT ON FUNCTION check_appointment_conflict IS 'Valida se há conflito de agenda antes de inserir/atualizar agendamento';
COMMENT ON FUNCTION validate_appointment_slot IS 'Trigger que valida conflitos de agenda automaticamente';
COMMENT ON FUNCTION activate_daily_appointments IS 'Rotina diária: ativa pré-agendamentos para D+1 e expira os não confirmados';
COMMENT ON FUNCTION expire_unconfirmed_appointments IS 'Expira pré-agendamentos não confirmados que passaram do prazo';

