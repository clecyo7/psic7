-- ============================================
-- MIGRATION: Criar tabela de profissionais
-- ============================================
-- Tabela para armazenar informações dos profissionais
-- Permite cadastrar profissionais e vincular pacientes
-- ============================================

-- Criar tabela professionals
CREATE TABLE IF NOT EXISTS professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  registration_number text UNIQUE, -- CRP, CRM, etc.
  specialization text, -- Especialização
  email text,
  phone text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_professionals_user_id ON professionals(user_id);
CREATE INDEX IF NOT EXISTS idx_professionals_active ON professionals(active);

-- Criar trigger para atualizar updated_at
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

-- Habilitar RLS
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;

-- Políticas: Usuários autenticados podem ver todos os profissionais ativos
CREATE POLICY "Usuários autenticados podem ver profissionais ativos"
  ON professionals
  FOR SELECT
  TO authenticated
  USING (active = true);

-- Políticas: Usuários autenticados podem criar profissionais
CREATE POLICY "Usuários autenticados podem criar profissionais"
  ON professionals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Políticas: Usuários autenticados podem atualizar profissionais
CREATE POLICY "Usuários autenticados podem atualizar profissionais"
  ON professionals
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas: Usuários autenticados podem deletar profissionais
CREATE POLICY "Usuários autenticados podem deletar profissionais"
  ON professionals
  FOR DELETE
  TO authenticated
  USING (true);

