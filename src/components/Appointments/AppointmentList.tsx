import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { isSuperAdmin } from '../../lib/superAdmin';
import { Calendar, Edit, CheckCircle, XCircle, Search, Filter, X, Trash2, Clock, User, MapPin, Video, ArrowLeft } from 'lucide-react';
import { useNavigation } from '../../contexts/NavigationContext';
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
  const { navigateToDashboard, currentView } = useNavigation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<string | undefined>();
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
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
        .is('deleted_at', null) // Filtrar apenas agendamentos não excluídos
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

  const handleCancel = async (appointmentId: string) => {
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

  const handleDelete = async (appointmentId: string) => {
    if (!confirm('Deseja realmente excluir este agendamento? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', appointmentId);

      if (error) throw error;
      alert('Agendamento excluído com sucesso!');
      loadAppointments();
    } catch (error: any) {
      alert('Erro ao excluir agendamento: ' + error.message);
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

      // Filtro por intervalo de datas
      if (filterDateFrom || filterDateTo) {
        const appointmentDateTime = new Date(appointment.appointment_date).getTime();
        
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (appointmentDateTime < fromDate.getTime()) {
            return false;
          }
        }
        
        if (filterDateTo) {
          const toDate = new Date(filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (appointmentDateTime > toDate.getTime()) {
            return false;
          }
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
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterStatus('');
    setFilterServiceType('');
  };

  const hasActiveFilters = searchTerm || filterDateFrom || filterDateTo || filterStatus || filterServiceType;

  // Agrupar agendamentos por período
  const groupAppointmentsByPeriod = (appointments: Appointment[]) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const groups = {
      hoje: [] as Appointment[],
      amanha: [] as Appointment[],
      estaSemana: [] as Appointment[],
      proximos: [] as Appointment[],
      passados: [] as Appointment[],
    };

    appointments.forEach((appointment) => {
      const aptDate = new Date(appointment.appointment_date);
      aptDate.setHours(0, 0, 0, 0);
      const aptTime = new Date(appointment.appointment_date).getTime();
      const nowTime = new Date().getTime();

      if (aptDate.getTime() === now.getTime()) {
        groups.hoje.push(appointment);
      } else if (aptDate.getTime() === tomorrow.getTime()) {
        groups.amanha.push(appointment);
      } else if (aptTime < nowTime) {
        groups.passados.push(appointment);
      } else if (aptDate <= nextWeek) {
        groups.estaSemana.push(appointment);
      } else {
        groups.proximos.push(appointment);
      }
    });

    return groups;
  };

  const groupedAppointments = groupAppointmentsByPeriod(filteredAppointments);

  const isPast = (appointmentDate: string) => {
    return new Date(appointmentDate).getTime() < new Date().getTime();
  };

  const isToday = (appointmentDate: string) => {
    const aptDate = new Date(appointmentDate);
    const today = new Date();
    return aptDate.toDateString() === today.toDateString();
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
        <div className="flex items-center gap-3">
          {currentView !== 'dashboard' && (
            <button
              onClick={navigateToDashboard}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="Voltar para Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Agendamentos</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Gerencie seus agendamentos</p>
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                min={filterDateFrom || undefined}
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
        <div className="space-y-6">
          {!hasActiveFilters && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-800">
                  Total: {filteredAppointments.length} agendamento(s)
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-blue-700">
                <span>Hoje: {groupedAppointments.hoje.length}</span>
                <span>Amanhã: {groupedAppointments.amanha.length}</span>
                <span>Esta Semana: {groupedAppointments.estaSemana.length}</span>
              </div>
            </div>
          )}

          {/* Agendamentos agrupados por período */}
          {Object.entries(groupedAppointments).map(([period, periodAppointments]) => {
            if (periodAppointments.length === 0) return null;

            const periodTitles: Record<string, { title: string; color: string; bgColor: string }> = {
              hoje: { title: 'Hoje', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
              amanha: { title: 'Amanhã', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
              estaSemana: { title: 'Esta Semana', color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200' },
              proximos: { title: 'Próximos', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200' },
              passados: { title: 'Passados', color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200' },
            };

            const periodInfo = periodTitles[period] || { title: period, color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200' };

            return (
              <div key={period} className="space-y-3">
                <div className={`${periodInfo.bgColor} border rounded-lg px-4 py-2 flex items-center justify-between`}>
                  <h3 className={`font-semibold ${periodInfo.color} flex items-center gap-2`}>
                    <Calendar className="w-4 h-4" />
                    {periodInfo.title}
                  </h3>
                  <span className={`text-sm font-medium ${periodInfo.color}`}>
                    {periodAppointments.length} {periodAppointments.length === 1 ? 'agendamento' : 'agendamentos'}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {periodAppointments.map((appointment) => {
                    const appointmentDate = new Date(appointment.appointment_date);
                    const isPastAppointment = isPast(appointment.appointment_date);
                    const isTodayAppointment = isToday(appointment.appointment_date);

                    return (
                      <div
                        key={appointment.id}
                        className={`bg-white rounded-xl shadow-md p-4 sm:p-5 hover:shadow-lg transition border-l-4 ${
                          isPastAppointment 
                            ? 'border-l-gray-400 opacity-75' 
                            : isTodayAppointment 
                            ? 'border-l-blue-500 ring-2 ring-blue-100' 
                            : 'border-l-green-500'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <h3 className="text-base sm:text-lg font-bold text-gray-800 truncate">
                                {appointment.patient.name}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                                {getStatusText(appointment.status)}
                              </span>
                              {appointment.confirmation?.confirmed && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Confirmado
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium">
                              {appointmentDate.toLocaleDateString('pt-BR', {
                                weekday: 'long',
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="font-semibold text-gray-900">
                              {appointmentDate.toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {isPastAppointment && (
                              <span className="text-xs text-red-600 font-medium">(Passado)</span>
                            )}
                            {isTodayAppointment && !isPastAppointment && (
                              <span className="text-xs text-blue-600 font-medium">(Hoje)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            {appointment.service_type === 'online' ? (
                              <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            ) : (
                              <MapPin className="w-4 h-4 text-green-500 flex-shrink-0" />
                            )}
                            <span className="capitalize font-medium">{appointment.service_type}</span>
                          </div>
                        </div>

                        {appointment.notes && (
                          <div className="mb-4 p-2 bg-gray-50 rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-600 mb-1 font-medium">Observações:</p>
                            <p className="text-sm text-gray-800 break-words">{appointment.notes}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                          {appointment.status === 'pending_confirmation' && (
                            <button
                              onClick={() => handleConfirm(appointment.id)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                              title="Confirmar"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Confirmar
                            </button>
                          )}
                          {appointment.status === 'confirmed' && (
                            <button
                              onClick={() => handleComplete(appointment.id)}
                              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                              title="Concluir"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Concluir
                            </button>
                          )}
                          {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                            <button
                              onClick={() => handleEdit(appointment.id)}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                              Editar
                            </button>
                          )}
                          {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancel(appointment.id)}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition text-sm font-medium"
                              title="Cancelar"
                            >
                              <XCircle className="w-4 h-4" />
                              Cancelar
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(appointment.id)}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-sm font-medium"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
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
