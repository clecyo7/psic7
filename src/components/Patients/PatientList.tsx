import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { isSuperAdmin } from '../../lib/superAdmin';
import { UserPlus, Edit, Calendar, Eye, X, Power, PowerOff, Search, Trash2 } from 'lucide-react';
import { PatientForm } from './PatientForm';

interface Patient {
  id: string;
  name: string;
  birth_date: string;
  document: string;
  email: string;
  service_type: string;
  active?: boolean;
  professional_id?: string;
  professional?: {
    id: string;
    name: string;
  };
}

interface PatientAppointment {
  id: string;
  appointment_date: string;
  status: string;
  service_type: string;
}

export function PatientList() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<string | undefined>();
  const [viewingAppointments, setViewingAppointments] = useState<string | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<PatientAppointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      loadPatients();
    }
  }, [user]);

  const loadPatients = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Verificar se é super admin diretamente aqui
      const admin = await isSuperAdmin(user.id);
      setIsAdmin(admin);
      
      let query = supabase
        .from('patients')
        .select(`
          *,
          professional:professionals(id, name)
        `);

      // Se não for super admin, filtrar apenas pacientes vinculados ao profissional
      if (!admin) {
        // Buscar o professional_id do usuário logado
        const { data: professional } = await supabase
          .from('professionals')
          .select('id')
          .eq('user_id', user.id)
          .eq('active', true)
          .single();

        if (professional) {
          query = query.eq('professional_id', professional.id);
        } else {
          // Se não encontrou profissional, não mostrar nenhum paciente
          setPatients([]);
          setLoading(false);
          return;
        }
      }

      // Por padrão, mostrar apenas pacientes ativos (mas super admin pode ver todos)
      // Se quiser mostrar inativos também, remova esta linha ou ajuste conforme necessário
      // query = query.eq('active', true);

      const { data, error } = await query.order('name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      // Erro ao carregar pacientes
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (patientId: string) => {
    setEditingPatient(patientId);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPatient(undefined);
  };

  const handleSave = () => {
    loadPatients();
  };

  const handleToggleActive = async (patientId: string, currentStatus: boolean) => {
    if (!confirm(`Tem certeza que deseja ${currentStatus ? 'desativar' : 'ativar'} este paciente?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('patients')
        .update({ active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', patientId);

      if (error) throw error;
      alert(`Paciente ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
      loadPatients();
    } catch (error: any) {
      alert('Erro ao atualizar status do paciente: ' + error.message);
    }
  };

  const handleViewAppointments = async (patientId: string) => {
    try {
      const userIsSuperAdmin = await isSuperAdmin(user?.id);
      
      let query = supabase
        .from('appointments')
        .select('id, appointment_date, status, service_type')
        .eq('patient_id', patientId)
        .gte('appointment_date', new Date().toISOString());

      // Se não for super admin, filtrar apenas agendamentos do próprio profissional
      if (!userIsSuperAdmin && user) {
        query = query.eq('professional_id', user.id);
      }

      const { data, error } = await query.order('appointment_date', { ascending: true });

      if (error) throw error;
      setPatientAppointments(data || []);
      setViewingAppointments(patientId);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (patientId: string) => {
    if (!confirm('Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;
      alert('Paciente excluído com sucesso!');
      loadPatients();
    } catch (error: any) {
      alert('Erro ao excluir paciente: ' + error.message);
    }
  };

  const filteredPatients = patients.filter((patient) =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.document?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_confirmation': return 'Pré-Agendamento';
      case 'confirmed': return 'Confirmado';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_confirmation': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Pacientes</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Gerencie seus pacientes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          Novo Paciente
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome, documento ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Documento</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Nascimento</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">E-mail</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo</th>
                  {isAdmin && (
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Profissional</th>
                  )}
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((patient) => (
                  <tr 
                    key={patient.id} 
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      patient.active === false ? 'opacity-60' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-gray-800 font-medium">{patient.name}</td>
                    <td className="py-3 px-4 text-gray-600">{patient.document || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(patient.birth_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{patient.email || '-'}</td>
                    <td className="py-3 px-4 text-gray-600 capitalize">{patient.service_type || '-'}</td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-gray-600">
                        {patient.professional?.name || '-'}
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          patient.active !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {patient.active !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewAppointments(patient.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Ver agendamentos"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(patient.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleToggleActive(patient.id, patient.active !== false)}
                              className={`p-2 rounded-lg transition ${
                                patient.active === false
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-orange-600 hover:bg-orange-50'
                              }`}
                              title={patient.active === false ? 'Ativar' : 'Desativar'}
                            >
                              {patient.active === false ? (
                                <Power className="w-4 h-4" />
                              ) : (
                                <PowerOff className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(patient.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <PatientForm
          patientId={editingPatient}
          onClose={handleCloseForm}
          onSave={handleSave}
        />
      )}

      {viewingAppointments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Agendamentos Futuros</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {patients.find(p => p.id === viewingAppointments)?.name}
                </p>
              </div>
              <button
                onClick={() => setViewingAppointments(null)}
                className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {patientAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum agendamento futuro encontrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patientAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            {new Date(appointment.appointment_date).toLocaleString('pt-BR', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                              {getStatusText(appointment.status)}
                            </span>
                            <span className="text-xs text-gray-600 capitalize">
                              {appointment.service_type}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
