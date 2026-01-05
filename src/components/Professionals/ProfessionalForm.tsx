import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';

interface ProfessionalFormProps {
  professionalId?: string;
  onClose: () => void;
  onSave: () => void;
}

export function ProfessionalForm({ professionalId, onClose, onSave }: ProfessionalFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    registration_number: '',
    specialization: '',
    email: '',
    phone: '',
    active: true,
  });

  useEffect(() => {
    if (professionalId) {
      loadProfessional();
    }
  }, [professionalId]);

  const loadProfessional = async () => {
    if (!professionalId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('id', professionalId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name || '',
          registration_number: data.registration_number || '',
          specialization: data.specialization || '',
          email: data.email || '',
          phone: data.phone || '',
          active: data.active ?? true,
        });
      }
    } catch (error: any) {
      alert('Erro ao carregar profissional: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.name.trim()) {
      alert('Por favor, informe o nome do profissional.');
      setLoading(false);
      return;
    }

    try {
      const professionalData = {
        name: formData.name.trim(),
        registration_number: formData.registration_number.trim() || null,
        specialization: formData.specialization.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        active: formData.active,
        updated_at: new Date().toISOString(),
      };

      if (professionalId) {
        // Atualizar profissional existente
        const { error } = await supabase
          .from('professionals')
          .update(professionalData)
          .eq('id', professionalId);

        if (error) throw error;
        alert('Profissional atualizado com sucesso!');
      } else {
        // Criar novo profissional
        const { error } = await supabase
          .from('professionals')
          .insert(professionalData);

        if (error) throw error;
        alert('Profissional criado com sucesso!');
      }

      onSave();
      onClose();
    } catch (error: any) {
      alert('Erro ao salvar profissional: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-xl z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            {professionalId ? 'Editar Profissional' : 'Novo Profissional'}
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
              Nome Completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="Ex: Dr. João Silva"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Registro
              </label>
              <input
                type="text"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Ex: CRP 06/123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialização
              </label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Ex: Psicologia Clínica"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                disabled={loading}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Profissional Ativo</span>
            </label>
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
              {loading ? 'Salvando...' : professionalId ? 'Atualizar' : 'Criar Profissional'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


