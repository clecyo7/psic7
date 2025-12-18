/*
  # Corrigir Políticas de Pacientes

  ## Mudanças

  1. Remove políticas restritivas da tabela patients
  2. Adiciona novas políticas permitindo profissionais criarem pacientes
  3. Torna user_id nullable para permitir cadastro por profissionais
  
  ## Segurança
  
  - Profissionais autenticados podem criar e gerenciar pacientes
  - Pacientes ainda podem ter user_id opcional para acesso próprio
*/

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view their own patient profile" ON patients;
DROP POLICY IF EXISTS "Users can create their own patient profile" ON patients;
DROP POLICY IF EXISTS "Users can update their own patient profile" ON patients;
DROP POLICY IF EXISTS "Professionals can view all patients" ON patients;

-- Tornar user_id nullable
ALTER TABLE patients ALTER COLUMN user_id DROP NOT NULL;

-- Novas políticas mais flexíveis
CREATE POLICY "Authenticated users can view patients"
  ON patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete patients"
  ON patients FOR DELETE
  TO authenticated
  USING (true);