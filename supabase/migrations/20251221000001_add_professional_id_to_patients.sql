-- ============================================
-- MIGRATION: Adicionar professional_id em patients
-- ============================================
-- Permite vincular pacientes a profissionais
-- ============================================

-- Adicionar coluna professional_id na tabela patients
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS professional_id uuid REFERENCES professionals(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_patients_professional_id ON patients(professional_id);

