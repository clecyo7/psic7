-- PARTE 3: CAMPOS ADICIONAIS
-- Execute esta parte por último (aguarde alguns segundos após a parte 2)

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

-- Add responsible fields to patients table
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

