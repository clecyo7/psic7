import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { isSuperAdmin } from '../../lib/superAdmin';
import { X } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
}

interface ReportFormProps {
  reportId?: string;
  onClose: () => void;
  onSave: () => void;
}

export function ReportForm({ reportId, onClose, onSave }: ReportFormProps) {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    patient_id: '',
    title: '',
    content: '',
    report_date: new Date().toISOString().split('T')[0],
    report_type: 'geral',
  });

  useEffect(() => {
    loadPatients();
    if (reportId) {
      loadReport();
    }
  }, [reportId, user]);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, professional_id')
        .order('name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      alert('Erro ao carregar pacientes: ' + error.message);
    }
  };

  const loadProfessional = async (professionalId: string) => {
    if (!professionalId) {
      setSelectedProfessional(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('id, name')
        .eq('id', professionalId)
        .single();

      if (error) throw error;
      setSelectedProfessional(data);
    } catch (error: any) {
      console.error('Erro ao carregar profissional:', error);
      setSelectedProfessional(null);
    }
  };

  const loadReport = async () => {
    if (!reportId) return;
    setLoading(true);
    try {
      const userIsSuperAdmin = await isSuperAdmin(user?.id);
      
      let query = supabase
        .from('reports')
        .select('*')
        .eq('id', reportId);

      // Se não for super admin, só pode carregar próprios relatórios
      if (!userIsSuperAdmin) {
        query = query.eq('professional_id', user?.id);
      }

      const { data, error } = await query.single();

      if (error) throw error;

      if (data) {
        setFormData({
          patient_id: data.patient_id,
          title: data.title,
          content: data.content,
          report_date: data.report_date ? new Date(data.report_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          report_type: data.report_type || 'geral',
        });
        
        // Buscar profissional vinculado ao paciente
        const { data: patientData } = await supabase
          .from('patients')
          .select('professional_id')
          .eq('id', data.patient_id)
          .single();
        
        if (patientData?.professional_id) {
          await loadProfessional(patientData.professional_id);
        }
      }
    } catch (error: any) {
      alert('Erro ao carregar relatório: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.patient_id) {
      alert('Por favor, selecione um paciente.');
      setLoading(false);
      return;
    }

    if (!formData.title.trim()) {
      alert('Por favor, informe um título para o relatório.');
      setLoading(false);
      return;
    }

    if (!formData.content.trim()) {
      alert('Por favor, preencha o conteúdo do relatório.');
      setLoading(false);
      return;
    }

    try {
      const reportData = {
        patient_id: formData.patient_id,
        professional_id: user?.id,
        title: formData.title.trim(),
        content: formData.content.trim(),
        report_date: formData.report_date,
        report_type: formData.report_type,
        updated_at: new Date().toISOString(),
      };

      if (reportId) {
        // Atualizar relatório existente
        const userIsSuperAdmin = await isSuperAdmin(user?.id);
        
        let query = supabase
          .from('reports')
          .update(reportData)
          .eq('id', reportId);

        // Se não for super admin, só pode atualizar próprios relatórios
        if (!userIsSuperAdmin) {
          query = query.eq('professional_id', user?.id);
        }

        const { error } = await query;

        if (error) throw error;
        alert('Relatório atualizado com sucesso!');
      } else {
        // Criar novo relatório
        const { error } = await supabase
          .from('reports')
          .insert(reportData);

        if (error) throw error;
        alert('Relatório criado com sucesso!');
      }

      onSave();
      onClose();
    } catch (error: any) {
      alert('Erro ao salvar relatório: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            {reportId ? 'Editar Relatório' : 'Novo Relatório'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paciente *
            </label>
            <select
              value={formData.patient_id}
              onChange={async (e) => {
                const patientId = e.target.value;
                setFormData({ ...formData, patient_id: patientId });
                
                // Buscar profissional vinculado ao paciente
                if (patientId) {
                  const patient = patients.find(p => p.id === patientId);
                  if (patient && (patient as any).professional_id) {
                    await loadProfessional((patient as any).professional_id);
                  } else {
                    setSelectedProfessional(null);
                  }
                } else {
                  setSelectedProfessional(null);
                }
              }}
              disabled={loading || !!reportId}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              required
            >
              <option value="">Selecione um paciente</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>

          {selectedProfessional && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Profissional que assinará o relatório:</p>
              <p className="text-lg font-semibold text-blue-900">{selectedProfessional.name}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Título do Relatório *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="Ex: Relatório de Avaliação Inicial"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data do Relatório *
              </label>
              <input
                type="date"
                value={formData.report_date}
                onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Relatório
              </label>
              <select
                value={formData.report_type}
                onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="geral">Geral</option>
                <option value="avaliacao">Avaliação</option>
                <option value="evolucao">Evolução</option>
                <option value="alta">Alta</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conteúdo do Relatório *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              disabled={loading}
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 resize-y"
              placeholder="Descreva as informações do relatório..."
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {loading ? 'Salvando...' : reportId ? 'Atualizar' : 'Criar Relatório'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

