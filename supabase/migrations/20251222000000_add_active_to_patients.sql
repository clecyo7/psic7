-- ============================================
-- MIGRATION: Adicionar campo active em patients
-- ============================================
-- Permite ativar/desativar pacientes
-- ============================================

-- Adicionar coluna active na tabela patients
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_patients_active ON patients(active);

-- Comentário
COMMENT ON COLUMN patients.active IS 'Indica se o paciente está ativo (true) ou inativo (false)';

