import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { isSuperAdmin } from '../../lib/superAdmin';
import { Calendar, Edit, CheckCircle, XCircle, Search, Filter, X } from 'lucide-react';
import { AppointmentForm } from './AppointmentForm';

interface Appointment {
  id: string;
  appointment_date: string;
  service_type: string;
  status: string;
  notes: string;
  patient: {
    id: string;
    name: string;
  };
  confirmation: {
    confirmed: boolean;
  } | null;
}

export function AppointmentList() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<string | undefined>();
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    try {
      const userIsSuperAdmin = await isSuperAdmin(user?.id);
      
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(id, name)
        `);

      // Se não for super admin, filtrar apenas os próprios agendamentos
      if (!userIsSuperAdmin) {
        query = query.eq('professional_id', user?.id);
      }

      const { data, error } = await query
        .or('is_active.eq.true,appointment_date.gte.' + new Date().toISOString())
        .order('appointment_date', { ascending: false });

      if (error) throw error;

      const appointmentsWithConfirmations = await Promise.all(
        (data || []).map(async (appointment: any) => {
          const { data: confirmation } = await supabase
            .from('appointment_confirmations')
            .select('confirmed')
            .eq('appointment_id', appointment.id)
            .maybeSingle();

          return {
            ...appointment,
            confirmation,
          };
        })
      );

      setAppointments(appointmentsWithConfirmations as Appointment[]);
    } catch (error) {
      // Erro ao carregar agendamentos
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (appointmentId: string) => {
    setEditingAppointment(appointmentId);
    setShowForm(true);
  };

  const handleDelete = async (appointmentId: string) => {
    if (!confirm('Deseja realmente cancelar este agendamento?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;
      loadAppointments();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleConfirm = async (appointmentId: string) => {
    try {
      const { error: confirmError } = await supabase
        .from('appointment_confirmations')
        .update({ confirmed: true, confirmed_at: new Date().toISOString() })
        .eq('appointment_id', appointmentId);

      if (confirmError) throw confirmError;

      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      loadAppointments();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleComplete = async (appointmentId: string) => {
    try {
      const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          patient_id,
          service_type,
          appointment_date,
          patient:patients(name, consultation_price)
        `)
        .eq('id', appointmentId)
        .single();

      if (fetchError) throw fetchError;
      if (!appointment) throw new Error('Agendamento não encontrado');

      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      const { error: recordError } = await supabase
        .from('medical_records')
        .insert([{
          patient_id: appointment.patient_id,
          appointment_id: appointmentId,
          professional_id: user?.id,
          content: '',
        }]);

      if (recordError) throw recordError;

      const patient = Array.isArray(appointment.patient) ? appointment.patient[0] : appointment.patient;
      const patientPrice = patient?.consultation_price;
      if (patientPrice && patientPrice > 0) {
        const appointmentDate = new Date(appointment.appointment_date);
        const dueDate = new Date(appointmentDate);
        dueDate.setDate(dueDate.getDate() + 7);

        const description = `Consulta ${appointment.service_type} - ${patient?.name || 'Paciente'} - ${appointmentDate.toLocaleDateString('pt-BR')}`;

        const { error: transactionError } = await supabase
          .from('financial_transactions')
          .insert([{
            appointment_id: appointmentId,
            patient_id: appointment.patient_id,
            professional_id: user?.id,
            amount: patientPrice,
            status: 'pending',
            due_date: dueDate.toISOString().split('T')[0],
            description: description,
          }]);

        if (transactionError) throw transactionError;
      }

      alert('Consulta concluída! Prontuário criado e aguardando preenchimento.');
      loadAppointments();
    } catch (error: any) {
      alert(error.message);
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_confirmation': return 'Pré-Agendamento';
      case 'confirmed': return 'Confirmado';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  // Filtrar e ordenar agendamentos
  const filteredAppointments = appointments
    .filter((appointment) => {
      // Filtro por nome
      if (searchTerm && !appointment.patient.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Filtro por data
      if (filterDate) {
        const appointmentDate = new Date(appointment.appointment_date).toISOString().split('T')[0];
        if (appointmentDate !== filterDate) {
          return false;
        }
      }

      // Filtro por status
      if (filterStatus && appointment.status !== filterStatus) {
        return false;
      }

      // Filtro por tipo de serviço
      if (filterServiceType && appointment.service_type !== filterServiceType) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        const nameA = a.patient.name.toLowerCase();
        const nameB = b.patient.name.toLowerCase();
        return sortOrder === 'asc' 
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      } else {
        // Ordenação por data: futuros mais próximos primeiro, depois passados mais recentes
        const now = new Date().getTime();
        const dateA = new Date(a.appointment_date).getTime();
        const dateB = new Date(b.appointment_date).getTime();
        const isAFuture = dateA >= now;
        const isBFuture = dateB >= now;

        // Se ambos são futuros ou ambos são passados
        if (isAFuture === isBFuture) {
          if (sortOrder === 'asc') {
            // Crescente: mais próximo primeiro (para futuros) ou mais antigo primeiro (para passados)
            return dateA - dateB;
          } else {
            // Decrescente: mais distante primeiro (para futuros) ou mais recente primeiro (para passados)
            return dateB - dateA;
          }
        } else {
          // Futuros sempre aparecem antes dos passados
          return isAFuture ? -1 : 1;
        }
      }
    });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDate('');
    setFilterStatus('');
    setFilterServiceType('');
  };

  const hasActiveFilters = searchTerm || filterDate || filterStatus || filterServiceType;

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Agendamentos</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Gerencie seus agendamentos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
          Novo Agendamento
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <div className="space-y-4">
          {/* Barra de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nome do paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Data
              </label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Todos</option>
                <option value="pending_confirmation">Pré-Agendamento</option>
                <option value="confirmed">Confirmado</option>
                <option value="completed">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Tipo de Serviço
              </label>
              <select
                value={filterServiceType}
                onChange={(e) => setFilterServiceType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Todos</option>
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Ordenar por
              </label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'name')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="date">Data</option>
                  <option value="name">Nome</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                  title={sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>

          {/* Botão limpar filtros */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {filteredAppointments.length} de {appointments.length} agendamento(s)
              </p>
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
                Limpar Filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center">
          <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Nenhum agendamento</h3>
          <p className="text-sm sm:text-base text-gray-600">Comece criando um novo agendamento</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center">
          <Filter className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Nenhum agendamento encontrado</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">Tente ajustar os filtros de busca</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {!hasActiveFilters && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              Mostrando {filteredAppointments.length} agendamento(s)
            </div>
          )}
          {filteredAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="bg-white rounded-xl shadow-md p-4 sm:p-6 hover:shadow-lg transition"
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
                <div className="flex-1 w-full sm:w-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800">
                      {appointment.patient.name}
                    </h3>
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium w-fit ${getStatusColor(appointment.status)}`}>
                      {getStatusText(appointment.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <span className="text-gray-600 block mb-1">Data:</span>
                      <p className="font-medium text-gray-800">
                        {new Date(appointment.appointment_date).toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 block mb-1">Hora:</span>
                      <p className="font-medium text-gray-800">
                        {new Date(appointment.appointment_date).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 block mb-1">Tipo:</span>
                      <p className="font-medium text-gray-800 capitalize">{appointment.service_type}</p>
                    </div>
                    {appointment.confirmation && (
                      <div>
                        <span className="text-gray-600 block mb-1">Confirmação:</span>
                        <p className={`font-medium ${appointment.confirmation.confirmed ? 'text-green-600' : 'text-yellow-600'}`}>
                          {appointment.confirmation.confirmed ? 'Confirmado' : 'Pendente'}
                        </p>
                      </div>
                    )}
                  </div>
                  {appointment.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <span className="text-gray-600 text-xs block mb-1">Observações:</span>
                      <p className="text-sm text-gray-800 break-words">{appointment.notes}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:ml-4 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                  {appointment.status === 'pending_confirmation' && (
                    <button
                      onClick={() => handleConfirm(appointment.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                      title="Confirmar"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                  {appointment.status === 'confirmed' && (
                    <button
                      onClick={() => handleComplete(appointment.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Concluir"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                  {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                    <>
                      <button
                        onClick={() => handleEdit(appointment.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(appointment.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Cancelar"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AppointmentForm
          appointmentId={editingAppointment}
          onClose={() => {
            setShowForm(false);
            setEditingAppointment(undefined);
          }}
          onSave={loadAppointments}
        />
      )}
    </div>
  );
}
