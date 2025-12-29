-- ============================================
-- MIGRATION: Corrigir políticas RLS da tabela professionals
-- ============================================
-- Permite ver todos os profissionais (ativos e inativos) para poder atualizá-los
-- ============================================

-- Remover política antiga de SELECT que só permitia ver profissionais ativos
DROP POLICY IF EXISTS "Usuários autenticados podem ver profissionais ativos" ON professionals;

-- Nova política: Usuários autenticados podem ver todos os profissionais
CREATE POLICY "Usuários autenticados podem ver todos os profissionais"
  ON professionals
  FOR SELECT
  TO authenticated
  USING (true);

