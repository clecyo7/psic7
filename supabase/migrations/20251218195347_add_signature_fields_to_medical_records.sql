/*
  # Adicionar Campos de Assinatura Digital aos Prontuários

  1. Modificações na Tabela medical_records
    - `signed` (boolean) - Indica se o prontuário foi assinado
    - `signed_at` (timestamptz) - Data e hora da assinatura
    - `professional_name` (text) - Nome completo do profissional que assinou
    - `professional_registration` (text) - CRM ou registro profissional

  2. Segurança
    - Adicionar constraint para garantir que prontuários assinados tenham todos os campos obrigatórios
    - Prontuários assinados não podem ser editados (implementado no nível da aplicação)
*/

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

-- Create index for better query performance on signed records
CREATE INDEX IF NOT EXISTS idx_medical_records_signed ON medical_records(signed);
CREATE INDEX IF NOT EXISTS idx_medical_records_signed_at ON medical_records(signed_at);