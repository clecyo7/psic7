-- ============================================
-- MIGRATION: Adicionar sistema de Super Admin
-- ============================================
-- Adiciona campo is_super_admin na tabela professionals
-- Permite que super admins vejam e gerenciem tudo
-- ============================================

-- Adicionar coluna is_super_admin
ALTER TABLE professionals 
ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_professionals_is_super_admin ON professionals(is_super_admin);

-- Função auxiliar para verificar se usuário é super admin
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

-- Comentário na função
COMMENT ON FUNCTION is_super_admin(uuid) IS 'Verifica se um usuário é super admin';

