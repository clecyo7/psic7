import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, Users, Shield, X } from 'lucide-react';
import { UserForm } from './UserForm';

interface User {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
}

interface Professional {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  is_super_admin: boolean;
  active: boolean;
}

export function AdminPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      await checkSuperAdmin();
    };
    initialize();
  }, [user]);

  useEffect(() => {
    if (isSuperAdmin && user) {
      loadData();
    }
  }, [isSuperAdmin, user]);

  const checkSuperAdmin = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .eq('active', true)
        .single();

      if (!error && data) {
        setIsSuperAdmin(data.is_super_admin || false);
      }
    } catch (error) {
      // Erro ao verificar super admin
    }
  };

  const loadData = async () => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Buscar profissionais com informações básicas
      const { data: professionalsData, error: professionalsError } = await supabase
        .from('professionals')
        .select('*')
        .order('created_at', { ascending: false });

      if (professionalsError) {
        throw professionalsError;
      }

      // Processar dados
      const professionalsList: Professional[] = professionalsData?.map((prof: any) => ({
        id: prof.id,
        user_id: prof.user_id,
        name: prof.name,
        email: prof.email,
        is_super_admin: prof.is_super_admin || false,
        active: prof.active,
      })) || [];

      setProfessionals(professionalsList);
    } catch (error: any) {
      alert('Erro ao carregar dados: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (userId: string) => {
    setSelectedUser(userId);
    setShowUserForm(true);
  };

  const handleToggleSuperAdmin = async (professionalId: string, currentStatus: boolean) => {
    if (!confirm(`Tem certeza que deseja ${currentStatus ? 'remover' : 'adicionar'} privilégios de super admin?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('professionals')
        .update({ is_super_admin: !currentStatus })
        .eq('id', professionalId);

      if (error) throw error;
      alert('Privilégios atualizados com sucesso!');
      loadData();
    } catch (error: any) {
      alert('Erro ao atualizar privilégios: ' + error.message);
    }
  };

  const handleToggleActive = async (professionalId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('professionals')
        .update({ active: !currentStatus })
        .eq('id', professionalId);

      if (error) throw error;
      alert('Status atualizado com sucesso!');
      loadData();
    } catch (error: any) {
      alert('Erro ao atualizar status: ' + error.message);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Restrito</h2>
        <p className="text-gray-600">Você não tem permissão para acessar esta área.</p>
        <p className="text-sm text-gray-500 mt-2">Apenas super administradores podem acessar.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Painel Administrativo
          </h1>
          <p className="text-gray-600 mt-1">Gerencie usuários e profissionais do sistema</p>
        </div>
        <button
          onClick={handleCreateUser}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <UserPlus className="w-5 h-5" />
          <span>Criar Novo Usuário</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="w-6 h-6" />
          Profissionais Cadastrados
        </h2>

        {professionals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum profissional cadastrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">E-mail</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Super Admin</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {professionals.map((professional) => (
                  <tr key={professional.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-800 font-medium">{professional.name}</td>
                    <td className="py-3 px-4 text-gray-600">{professional.email || '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          professional.is_super_admin
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {professional.is_super_admin ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          professional.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {professional.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleToggleSuperAdmin(professional.id, professional.is_super_admin)}
                          className={`px-3 py-1 rounded text-xs font-medium transition ${
                            professional.is_super_admin
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                          title={professional.is_super_admin ? 'Remover Super Admin' : 'Tornar Super Admin'}
                        >
                          {professional.is_super_admin ? 'Remover Admin' : 'Tornar Admin'}
                        </button>
                        <button
                          onClick={() => handleToggleActive(professional.id, professional.active)}
                          className={`px-3 py-1 rounded text-xs font-medium transition ${
                            professional.active
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                          title={professional.active ? 'Desativar' : 'Ativar'}
                        >
                          {professional.active ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUserForm && (
        <UserForm
          userId={selectedUser || undefined}
          onClose={() => {
            setShowUserForm(false);
            setSelectedUser(null);
            // Recarregar dados após fechar o formulário
            setTimeout(() => {
              loadData();
            }, 500);
          }}
          onSave={async () => {
            // Aguardar um pouco para garantir que o insert foi concluído
            await new Promise(resolve => setTimeout(resolve, 300));
            loadData();
            setShowUserForm(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}

