/*
  # Adicionar Campo de Responsável para Pacientes

  1. Modificações na Tabela patients
    - `responsible_name` (text) - Nome do responsável (para menores de idade)
    - `responsible_document` (text) - CPF/RG do responsável
    - `responsible_phone` (text) - Telefone do responsável

  2. Notas Importantes
    - Campos opcionais para permitir flexibilidade
    - Importante para pacientes menores de idade
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'responsible_name'
  ) THEN
    ALTER TABLE patients ADD COLUMN responsible_name text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'responsible_document'
  ) THEN
    ALTER TABLE patients ADD COLUMN responsible_document text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'responsible_phone'
  ) THEN
    ALTER TABLE patients ADD COLUMN responsible_phone text DEFAULT '';
  END IF;
END $$;