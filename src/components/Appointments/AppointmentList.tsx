import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Edit, Trash2, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
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

  useEffect(() => {
    loadAppointments();
  }, [user]);

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(id, name)
        `)
        .eq('professional_id', user?.id)
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
      console.error('Error loading appointments:', error);
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
      const { data: appointment } = await supabase
        .from('appointments')
        .select(`
          patient_id,
          service_type,
          appointment_date,
          patient:patients(name, consultation_price)
        `)
        .eq('id', appointmentId)
        .single();

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

      const patientPrice = appointment.patient.consultation_price;
      if (patientPrice && patientPrice > 0) {
        const appointmentDate = new Date(appointment.appointment_date);
        const dueDate = new Date(appointmentDate);
        dueDate.setDate(dueDate.getDate() + 7);

        const description = `Consulta ${appointment.service_type} - ${appointment.patient.name} - ${appointmentDate.toLocaleDateString('pt-BR')}`;

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
      case 'pending_confirmation': return 'Aguardando Confirmação';
      case 'confirmed': return 'Confirmado';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Agendamentos</h1>
          <p className="text-gray-600 mt-1">Gerencie seus agendamentos</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          <Calendar className="w-5 h-5" />
          Novo Agendamento
        </button>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhum agendamento</h3>
          <p className="text-gray-600">Comece criando um novo agendamento</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-800">
                      {appointment.patient.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {getStatusText(appointment.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Data e Hora:</span>
                      <p className="font-medium text-gray-800">
                        {new Date(appointment.appointment_date).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Tipo:</span>
                      <p className="font-medium text-gray-800 capitalize">{appointment.service_type}</p>
                    </div>
                    {appointment.notes && (
                      <div>
                        <span className="text-gray-600">Observações:</span>
                        <p className="font-medium text-gray-800">{appointment.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
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
