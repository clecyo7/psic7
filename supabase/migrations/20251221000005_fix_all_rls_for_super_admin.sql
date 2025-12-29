-- ============================================
-- MIGRATION: Corrigir TODAS as políticas RLS para Super Admin
-- ============================================
-- Garante que super admins vejam TUDO em todas as tabelas
-- ============================================

-- Verificar se a função is_super_admin existe, se não, criar
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM professionals 
    WHERE user_id = user_uuid 
    AND is_super_admin = true
    AND active = true
  );
END;
$$;

-- ============================================
-- PATIENTS - Super admin vê todos
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view patients" ON patients;
CREATE POLICY "Authenticated users can view patients"
  ON patients FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()) OR true);

DROP POLICY IF EXISTS "Authenticated users can create patients" ON patients;
CREATE POLICY "Authenticated users can create patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR true);

DROP POLICY IF EXISTS "Authenticated users can update patients" ON patients;
CREATE POLICY "Authenticated users can update patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR true)
  WITH CHECK (is_super_admin(auth.uid()) OR true);

DROP POLICY IF EXISTS "Authenticated users can delete patients" ON patients;
CREATE POLICY "Authenticated users can delete patients"
  ON patients FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR true);

-- ============================================
-- APPOINTMENTS - Super admin vê todos
-- ============================================
DROP POLICY IF EXISTS "Professionals can view their appointments" ON appointments;
CREATE POLICY "Professionals can view their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()) OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can create appointments" ON appointments;
CREATE POLICY "Professionals can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can update their appointments" ON appointments;
CREATE POLICY "Professionals can update their appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR professional_id = auth.uid())
  WITH CHECK (is_super_admin(auth.uid()) OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can delete their appointments" ON appointments;
CREATE POLICY "Professionals can delete their appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR professional_id = auth.uid());

-- ============================================
-- MEDICAL_RECORDS - Super admin vê todos
-- ============================================
DROP POLICY IF EXISTS "Professionals can view medical records of their patients" ON medical_records;
CREATE POLICY "Professionals can view medical records of their patients"
  ON medical_records FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()) OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can create medical records" ON medical_records;
CREATE POLICY "Professionals can create medical records"
  ON medical_records FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can update their medical records" ON medical_records;
CREATE POLICY "Professionals can update their medical records"
  ON medical_records FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR professional_id = auth.uid())
  WITH CHECK (is_super_admin(auth.uid()) OR professional_id = auth.uid());

-- ============================================
-- REPORTS - Super admin vê todos
-- ============================================
DROP POLICY IF EXISTS "Profissionais podem ver seus próprios relatórios" ON reports;
CREATE POLICY "Profissionais podem ver seus próprios relatórios"
  ON reports FOR SELECT
  USING (is_super_admin(auth.uid()) OR auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais podem criar relatórios" ON reports;
CREATE POLICY "Profissionais podem criar relatórios"
  ON reports FOR INSERT
  WITH CHECK (is_super_admin(auth.uid()) OR auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais podem atualizar seus próprios relatórios" ON reports;
CREATE POLICY "Profissionais podem atualizar seus próprios relatórios"
  ON reports FOR UPDATE
  USING (is_super_admin(auth.uid()) OR auth.uid() = professional_id)
  WITH CHECK (is_super_admin(auth.uid()) OR auth.uid() = professional_id);

DROP POLICY IF EXISTS "Profissionais podem deletar seus próprios relatórios" ON reports;
CREATE POLICY "Profissionais podem deletar seus próprios relatórios"
  ON reports FOR DELETE
  USING (is_super_admin(auth.uid()) OR auth.uid() = professional_id);

-- ============================================
-- FINANCIAL_TRANSACTIONS - Super admin vê todos
-- ============================================
DROP POLICY IF EXISTS "Professionals can view their transactions" ON financial_transactions;
CREATE POLICY "Professionals can view their transactions"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()) OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can create transactions" ON financial_transactions;
CREATE POLICY "Professionals can create transactions"
  ON financial_transactions FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can update their transactions" ON financial_transactions;
CREATE POLICY "Professionals can update their transactions"
  ON financial_transactions FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR professional_id = auth.uid())
  WITH CHECK (is_super_admin(auth.uid()) OR professional_id = auth.uid());

-- ============================================
-- PROFESSIONALS - Super admin vê todos
-- ============================================
DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os profissionais" ON professionals;
CREATE POLICY "Usuários autenticados podem ver todos os profissionais"
  ON professionals FOR SELECT
  TO authenticated
  USING (
    is_super_admin(auth.uid()) 
    OR active = true
  );

DROP POLICY IF EXISTS "Usuários autenticados podem criar profissionais" ON professionals;
CREATE POLICY "Usuários autenticados podem criar profissionais"
  ON professionals FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()) OR true);

DROP POLICY IF EXISTS "Usuários autenticados podem atualizar profissionais" ON professionals;
CREATE POLICY "Usuários autenticados podem atualizar profissionais"
  ON professionals FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR true)
  WITH CHECK (is_super_admin(auth.uid()) OR true);

DROP POLICY IF EXISTS "Usuários autenticados podem deletar profissionais" ON professionals;
CREATE POLICY "Usuários autenticados podem deletar profissionais"
  ON professionals FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR true);

