import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { isSuperAdmin } from '../../lib/superAdmin';
import { ProfessionalForm } from './ProfessionalForm';
import { Plus, Edit, Trash2, Search } from 'lucide-react';

interface Professional {
  id: string;
  name: string;
  registration_number: string | null;
  specialization: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  created_at: string;
}

export function ProfessionalList() {
  const { user } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProfessionalId, setEditingProfessionalId] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    checkAdminStatus();
    loadProfessionals();
  }, [user]);

  const checkAdminStatus = async () => {
    if (user) {
      const admin = await isSuperAdmin(user.id);
      setIsAdmin(admin);
    }
  };

  const loadProfessionals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .order('name');

      if (error) throw error;
      setProfessionals(data || []);
    } catch (error: any) {
      alert('Erro ao carregar profissionais: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este profissional?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('professionals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Profissional excluído com sucesso!');
      loadProfessionals();
    } catch (error: any) {
      alert('Erro ao excluir profissional: ' + error.message);
    }
  };

  const handleEdit = (id: string) => {
    setEditingProfessionalId(id);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProfessionalId(undefined);
  };

  const filteredProfessionals = professionals.filter((professional) =>
    professional.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    professional.registration_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    professional.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Profissionais</h1>
          <p className="text-gray-600 mt-1">Gerencie os profissionais do consultório</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Profissional</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome, registro ou especialização..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredProfessionals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'Nenhum profissional encontrado' : 'Nenhum profissional cadastrado'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Registro</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Especialização</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">E-mail</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Telefone</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfessionals.map((professional) => (
                  <tr key={professional.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-800 font-medium">{professional.name}</td>
                    <td className="py-3 px-4 text-gray-600">{professional.registration_number || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{professional.specialization || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{professional.email || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">{professional.phone || '-'}</td>
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
                      {isAdmin && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(professional.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(professional.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <ProfessionalForm
          professionalId={editingProfessionalId}
          onClose={handleCloseForm}
          onSave={() => {
            loadProfessionals();
            handleCloseForm();
          }}
        />
      )}
    </div>
  );
}

