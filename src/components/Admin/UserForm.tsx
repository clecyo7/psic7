import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

interface UserFormProps {
  userId?: string;
  onClose: () => void;
  onSave: () => void;
}

export function UserForm({ userId, onClose, onSave }: UserFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    registration_number: '',
    specialization: '',
    phone: '',
    is_super_admin: false,
  });

  useEffect(() => {
    if (userId) {
      loadUser();
    }
  }, [userId]);

  const loadUser = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // Buscar profissional pelo user_id
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          email: data.email || '',
          password: '', // Não carregar senha
          name: data.name || '',
          registration_number: data.registration_number || '',
          specialization: data.specialization || '',
          phone: data.phone || '',
          is_super_admin: data.is_super_admin || false,
        });
      }
    } catch (error: any) {
      alert('Erro ao carregar usuário: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.email.trim()) {
      alert('Por favor, informe o e-mail.');
      setLoading(false);
      return;
    }

    if (!userId && !formData.password.trim()) {
      alert('Por favor, informe a senha para criar o usuário.');
      setLoading(false);
      return;
    }

    if (!formData.name.trim()) {
      alert('Por favor, informe o nome do profissional.');
      setLoading(false);
      return;
    }

    try {
      if (userId) {
        // Atualizar usuário existente
        // Nota: Atualizar senha requer chamada especial do Supabase Auth
        // Por enquanto, vamos apenas atualizar o profissional
        const { error: professionalError } = await supabase
          .from('professionals')
          .update({
            name: formData.name.trim(),
            registration_number: formData.registration_number.trim() || null,
            specialization: formData.specialization.trim() || null,
            email: formData.email.trim(),
            phone: formData.phone.trim() || null,
            is_super_admin: formData.is_super_admin,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (professionalError) throw professionalError;

        // Se houver senha, atualizar via Edge Function
        if (formData.password.trim()) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            throw new Error('Você precisa estar autenticado para atualizar senhas');
          }

          const response = await fetch(`${supabaseUrl}/functions/v1/update-user-password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            },
            body: JSON.stringify({
              user_id: userId,
              password: formData.password.trim(),
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Erro ao atualizar senha');
          }
        }

        alert('Usuário atualizado com sucesso!');
      } else {
        // Criar novo usuário usando Edge Function
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Você precisa estar autenticado para criar usuários');
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
          },
          body: JSON.stringify({
            email: formData.email.trim(),
            password: formData.password.trim(),
            name: formData.name.trim(),
            registration_number: formData.registration_number.trim() || null,
            specialization: formData.specialization.trim() || null,
            phone: formData.phone.trim() || null,
            is_super_admin: formData.is_super_admin,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Erro ao criar usuário');
        }

        alert('Usuário criado com sucesso!');
      }

      // Aguardar um pouco para garantir que o insert foi concluído
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onSave();
      onClose();
    } catch (error: any) {
      alert('Erro ao salvar usuário: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            {userId ? 'Editar Usuário' : 'Criar Novo Usuário'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-mail *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading || !!userId}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="email@exemplo.com"
              required
            />
          </div>

          {!userId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
            </div>
          )}
          
          {userId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Senha (deixe em branco para não alterar)
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Deixe em branco para não alterar"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="Ex: Dr. João Silva"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Registro
              </label>
              <input
                type="text"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Ex: CRP 06/123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialização
              </label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Ex: Psicologia Clínica"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_super_admin}
                onChange={(e) => setFormData({ ...formData, is_super_admin: e.target.checked })}
                disabled={loading}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Super Administrador</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              Super administradores têm acesso total ao sistema e podem gerenciar todos os usuários.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? 'Salvando...' : userId ? 'Atualizar' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

