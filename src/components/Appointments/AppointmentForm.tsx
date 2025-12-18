import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { X } from 'lucide-react';

interface AppointmentFormProps {
  appointmentId?: string;
  onClose: () => void;
  onSave: () => void;
}

export function AppointmentForm({ appointmentId, onClose, onSave }: AppointmentFormProps) {
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
    }
  }, [appointmentId]);

  const loadPatients = async () => {
    const { data } = await supabase
      .from('patients')
      .select('id, name')
      .order('name');

    setPatients(data || []);
  };

  const loadAppointment = async () => {
    const { data, error } = await supabase
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
      const appointmentDate = new Date(`${formData.appointment_date}T${formData.appointment_time}`);

      if (appointmentId) {
        const { error } = await supabase
          .from('appointments')
          .update({
            patient_id: formData.patient_id,
            appointment_date: appointmentDate.toISOString(),
            service_type: formData.service_type,
            notes: formData.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', appointmentId);

        if (error) throw error;
      } else {
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert([{
            patient_id: formData.patient_id,
            professional_id: user?.id,
            appointment_date: appointmentDate.toISOString(),
            service_type: formData.service_type,
            status: 'pending_confirmation',
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
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-2xl font-bold text-gray-800">
            {appointmentId ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
