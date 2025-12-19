import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X, Trash2 } from 'lucide-react';
import { checkAppointmentConflict } from '../../lib/appointmentScheduler';

interface AppointmentFormProps {
  appointmentId?: string;
  onClose: () => void;
  onSave: () => void;
  initialDate?: string; // Data inicial para novo agendamento
  noOverlay?: boolean; // Se true, não renderiza o overlay (para uso dentro de outros modais)
}

export function AppointmentForm({ appointmentId, onClose, onSave, initialDate, noOverlay = false }: AppointmentFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    patient_id: '',
    appointment_date: '',
    appointment_time: '',
    service_type: 'presencial' as 'online' | 'presencial',
    notes: '',
  });

  useEffect(() => {
    loadPatients();
    if (appointmentId) {
      loadAppointment();
    } else if (initialDate) {
      // Se for um novo agendamento com data inicial, preencher o formulário
      setFormData(prev => ({
        ...prev,
        appointment_date: initialDate,
      }));
    }
  }, [appointmentId, initialDate]);

  const loadPatients = async () => {
    const { data } = await supabase
      .from('patients')
      .select('id, name')
      .order('name');

    setPatients(data || []);
  };

  const loadAppointment = async () => {
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .maybeSingle();

    if (data) {
      const date = new Date(data.appointment_date);
      setFormData({
        patient_id: data.patient_id,
        appointment_date: date.toISOString().split('T')[0],
        appointment_time: date.toTimeString().slice(0, 5),
        service_type: data.service_type,
        notes: data.notes || '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const appointmentDate = new Date(`${formData.appointment_date}T${formData.appointment_time}`);
      
      // Verificar conflito de agenda antes de criar/atualizar
      const hasConflict = !(await checkAppointmentConflict(
        user.id,
        appointmentDate.toISOString(),
        appointmentId
      ));

      if (hasConflict) {
        alert('Já existe um agendamento para este horário. Por favor, escolha outro horário.');
        return;
      }

      // Calcular data de expiração: 2 horas antes do agendamento
      const expiresAt = new Date(appointmentDate);
      expiresAt.setHours(expiresAt.getHours() - 2);

      if (appointmentId) {
        const { error } = await supabase
          .from('appointments')
          .update({
            patient_id: formData.patient_id,
            appointment_date: appointmentDate.toISOString(),
            service_type: formData.service_type,
            notes: formData.notes,
            expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', appointmentId);

        if (error) throw error;
      } else {
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert([{
            patient_id: formData.patient_id,
            professional_id: user.id,
            appointment_date: appointmentDate.toISOString(),
            service_type: formData.service_type,
            status: 'pending_confirmation',
            is_active: true, // Agendamentos manuais são ativos imediatamente
            expires_at: expiresAt.toISOString(),
            notification_sent: false,
            notes: formData.notes,
          }])
          .select()
          .single();

        if (appointmentError) throw appointmentError;

        const { error: confirmError } = await supabase
          .from('appointment_confirmations')
          .insert([{
            appointment_id: appointment.id,
            confirmed: false,
          }]);

        if (confirmError) throw confirmError;
      }

      onSave();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar agendamento');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!appointmentId) return;
    
    if (!confirm('Deseja realmente cancelar este agendamento?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;
      onSave();
      onClose();
    } catch (error: any) {
      alert(error.message || 'Erro ao cancelar agendamento');
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <div className={`bg-white rounded-xl shadow-2xl max-w-2xl w-full ${noOverlay ? '' : 'max-h-[95vh] my-4'} overflow-y-auto`}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            {appointmentId ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paciente
            </label>
            <select
              required
              value={formData.patient_id}
              onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione um paciente...</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data
              </label>
              <input
                type="date"
                required
                value={formData.appointment_date}
                onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horário
              </label>
              <input
                type="time"
                required
                value={formData.appointment_time}
                onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Atendimento
            </label>
            <select
              required
              value={formData.service_type}
              onChange={(e) => setFormData({ ...formData, service_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="presencial">Presencial</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
            {appointmentId && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 sm:px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm sm:text-base flex items-center gap-2 order-3"
              >
                <Trash2 className="w-4 h-4" />
                Cancelar Agendamento
              </button>
            )}
            <div className="flex flex-col sm:flex-row gap-3 ml-auto order-1 sm:order-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm sm:text-base"
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm sm:text-base"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </form>
      </div>
  );

  if (noOverlay) {
    return formContent;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      {formContent}
    </div>
  );
}
