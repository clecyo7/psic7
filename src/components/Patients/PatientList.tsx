import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, Edit, Calendar, Eye, X } from 'lucide-react';
import { PatientForm } from './PatientForm';

interface Patient {
  id: string;
  name: string;
  birth_date: string;
  document: string;
  email: string;
  service_type: string;
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
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<string | undefined>();
  const [viewingAppointments, setViewingAppointments] = useState<string | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<PatientAppointment[]>([]);

  useEffect(() => {
    loadPatients();
  }, [user]);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
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

  const handleViewAppointments = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, appointment_date, status, service_type')
        .eq('patient_id', patientId)
        .eq('professional_id', user?.id)
        .gte('appointment_date', new Date().toISOString())
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      setPatientAppointments(data || []);
      setViewingAppointments(patientId);
    } catch (error: any) {
      alert(error.message);
    }
  };

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

      {patients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center">
          <UserPlus className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Nenhum paciente cadastrado</h3>
          <p className="text-sm sm:text-base text-gray-600">Comece adicionando seu primeiro paciente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white rounded-xl shadow-md p-4 sm:p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 truncate">{patient.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{patient.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewAppointments(patient.id)}
                    className="text-green-600 hover:text-green-700 transition flex-shrink-0 p-1"
                    aria-label="Ver agendamentos"
                    title="Ver agendamentos futuros"
                  >
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(patient.id)}
                    className="text-blue-600 hover:text-blue-700 transition flex-shrink-0 p-1"
                    aria-label="Editar paciente"
                  >
                    <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Documento:</span>
                  <span className="font-medium text-gray-800 text-right break-words">{patient.document}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Nascimento:</span>
                  <span className="font-medium text-gray-800">
                    {new Date(patient.birth_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium text-gray-800 capitalize">{patient.service_type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
