-- ============================================
-- MIGRATION: Atualizar políticas RLS para Super Admin
-- ============================================
-- Permite que super admins vejam e gerenciem todos os dados
-- ============================================

-- Atualizar políticas de professionals para permitir super admin ver tudo
DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os profissionais" ON professionals;

CREATE POLICY "Usuários autenticados podem ver todos os profissionais"
  ON professionals
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins podem ver tudo
    is_super_admin(auth.uid()) 
    OR 
    -- Outros podem ver profissionais ativos
    active = true
  );

-- Atualizar políticas de patients para super admin
DROP POLICY IF EXISTS "Authenticated users can view patients" ON patients;
CREATE POLICY "Authenticated users can view patients"
  ON patients FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR true
  );

-- Atualizar políticas de appointments para super admin
DROP POLICY IF EXISTS "Professionals can view their appointments" ON appointments;
CREATE POLICY "Professionals can view their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR professional_id = auth.uid()
  );

-- Atualizar políticas de reports para super admin
DROP POLICY IF EXISTS "Profissionais podem ver seus próprios relatórios" ON reports;
CREATE POLICY "Profissionais podem ver seus próprios relatórios"
  ON reports
  FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR auth.uid() = professional_id
  );

-- Atualizar políticas de medical_records para super admin
DROP POLICY IF EXISTS "Professionals can view medical records of their patients" ON medical_records;
CREATE POLICY "Professionals can view medical records of their patients"
  ON medical_records FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) OR professional_id = auth.uid()
  );

