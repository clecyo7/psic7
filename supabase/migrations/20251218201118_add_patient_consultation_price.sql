/*
  # Adicionar Preço de Consulta por Paciente

  1. Modificações na Tabela patients
    - `consultation_price` (decimal) - Valor da consulta para este paciente

  2. Modificações na Tabela financial_transactions
    - Melhorar campos existentes para suportar edição completa

  3. Notas Importantes
    - Cada paciente pode ter um valor de consulta personalizado
    - Valores a receber são gerados automaticamente ao concluir consultas
    - Transações podem ser editadas (valor, status, datas)
*/

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

-- Add description field to financial_transactions for better tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_transactions' AND column_name = 'description'
  ) THEN
    ALTER TABLE financial_transactions ADD COLUMN description text DEFAULT '';
  END IF;
END $$;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_consultation_price ON patients(consultation_price);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_due_date ON financial_transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_paid_date ON financial_transactions(paid_date);