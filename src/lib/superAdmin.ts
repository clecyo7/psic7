import { supabase } from './supabase';

/**
 * Verifica se o usuário atual é super admin
 */
export async function isSuperAdmin(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from('professionals')
      .select('is_super_admin')
      .eq('user_id', userId)
      .eq('active', true)
      .single();

    if (error || !data) return false;
    return data.is_super_admin || false;
  } catch (error) {
    console.error('Erro ao verificar super admin:', error);
    return false;
  }
}

