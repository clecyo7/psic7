import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { isSuperAdmin } from '../../lib/superAdmin';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { AppointmentForm } from '../Appointments/AppointmentForm';

interface CalendarAppointment {
  id: string;
  appointment_date: string;
  service_type: string;
  status: string;
  notes: string;
  patient: {
    id: string;
    name: string;
  } | null;
}

export function AppointmentCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [showDayAppointments, setShowDayAppointments] = useState<Date | null>(null);

  useEffect(() => {
    loadAppointments();
  }, [user, currentDate]);

  const loadAppointments = async () => {
    try {
      const userIsSuperAdmin = await isSuperAdmin(user?.id);
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);

      let query = supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(id, name)
        `)
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', endDate.toISOString())
        .order('appointment_date', { ascending: true });

      // Se não for super admin, filtrar apenas os próprios agendamentos
      if (!userIsSuperAdmin) {
        query = query.eq('professional_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments((data || []) as CalendarAppointment[]);
    } catch (error) {
      // Erro ao carregar agendamentos
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Dias do mês anterior para preencher a primeira semana
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
      });
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Dias do próximo mês para completar a última semana
    const remainingDays = 42 - days.length; // 6 semanas * 7 dias
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date).toISOString().split('T')[0];
      return aptDate === dateStr;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'pending_confirmation':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dateAppointments = getAppointmentsForDate(date);
    if (dateAppointments.length > 0) {
      setSelectedAppointment(dateAppointments[0].id);
      setShowForm(true);
    } else {
      // Criar novo agendamento para esta data
      setSelectedAppointment(undefined);
      setShowForm(true);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedAppointment(undefined);
    setSelectedDate(null);
  };

  const handleSave = () => {
    loadAppointments();
    handleCloseForm();
  };

  const handleShowMoreAppointments = (date: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDayAppointments(date);
  };

  const handleCloseDayAppointments = () => {
    setShowDayAppointments(null);
  };

  const handleAppointmentClick = (appointmentId: string) => {
    setSelectedAppointment(appointmentId);
    setShowDayAppointments(null);
    setShowForm(true);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_confirmation': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const days = getDaysInMonth(currentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando calendário...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header do Calendário */}
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Hoje
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setSelectedDate(new Date());
                setSelectedAppointment(undefined);
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Agendamento</span>
            </button>
          </div>
        </div>

        {/* Legenda de Status */}
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Confirmado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Concluído</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Cancelado</span>
          </div>
        </div>

        {/* Grid do Calendário */}
        <div className="grid grid-cols-7 gap-1">
          {/* Cabeçalho dos dias da semana */}
          {weekDays.map(day => (
            <div
              key={day}
              className="p-2 text-center text-sm font-semibold text-gray-600 bg-gray-50 rounded"
            >
              {day}
            </div>
          ))}

          {/* Dias do calendário */}
          {days.map((day, index) => {
            const dayAppointments = getAppointmentsForDate(day.date);
            const isToday = day.date.toISOString().split('T')[0] === today.toISOString().split('T')[0];
            const isPast = day.date < today && !isToday;

            return (
              <div
                key={index}
                onClick={() => handleDateClick(day.date)}
                className={`
                  min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border border-gray-200 rounded cursor-pointer
                  hover:bg-blue-50 transition
                  ${!day.isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                  ${isToday ? 'ring-2 ring-blue-500' : ''}
                  ${isPast ? 'opacity-60' : ''}
                `}
              >
                <div className={`
                  text-sm font-medium mb-1
                  ${isToday ? 'text-blue-600 font-bold' : ''}
                `}>
                  {day.date.getDate()}
                </div>
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map(apt => (
                    <div
                      key={apt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAppointment(apt.id);
                        setShowForm(true);
                      }}
                      className={`
                        text-xs p-1 rounded truncate text-white cursor-pointer
                        ${getStatusColor(apt.status)}
                        hover:opacity-80 transition
                      `}
                      title={`${apt.patient?.name || 'Sem paciente'} - ${new Date(apt.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                    >
                      {new Date(apt.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      {apt.patient?.name && ` - ${apt.patient.name.substring(0, 10)}`}
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div 
                      onClick={(e) => handleShowMoreAppointments(day.date, e)}
                      className="text-xs text-gray-500 font-medium cursor-pointer hover:text-blue-600 hover:underline transition"
                    >
                      +{dayAppointments.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Agendamentos do Dia */}
      {showDayAppointments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Agendamentos do Dia</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {showDayAppointments.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <button
                onClick={handleCloseDayAppointments}
                className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {(() => {
                const dayAppts = getAppointmentsForDate(showDayAppointments);
                if (dayAppts.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <p className="text-gray-600">Nenhum agendamento para este dia</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {dayAppts.map((appointment) => (
                      <div
                        key={appointment.id}
                        onClick={() => handleAppointmentClick(appointment.id)}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 cursor-pointer transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-lg font-semibold text-gray-800">
                                {new Date(appointment.appointment_date).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)} text-white`}>
                                {getStatusText(appointment.status)}
                              </span>
                            </div>
                            <p className="text-gray-700 font-medium">
                              {appointment.patient?.name || 'Sem paciente'}
                            </p>
                            <p className="text-sm text-gray-600 capitalize mt-1">
                              {appointment.service_type}
                            </p>
                            {appointment.notes && (
                              <p className="text-sm text-gray-500 mt-2 italic">
                                {appointment.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <AppointmentForm
              appointmentId={selectedAppointment}
              onClose={handleCloseForm}
              onSave={handleSave}
              initialDate={selectedDate ? selectedDate.toISOString().split('T')[0] : undefined}
              noOverlay={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}

