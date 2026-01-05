import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { isSuperAdmin } from '../../lib/superAdmin';
import { X } from 'lucide-react';

// Função para gerar agendamentos automáticos
const generateRecurringAppointments = async (
  patientId: string,
  professionalId: string,
  frequency: 'semanal' | 'quinzenal',
  dayOfWeek: number,
  time: string,
  serviceType: string,
  numAppointments: number = 12 // Gerar 12 agendamentos por padrão
) => {
  const appointments = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Resetar horas para comparação
  
  // Encontrar o próximo dia da semana
  const currentDay = today.getDay();
  let daysUntilNext = (dayOfWeek - currentDay + 7) % 7;
  
  // Se hoje é o dia, verificar se já passou do horário
  if (daysUntilNext === 0) {
    const [hours, minutes] = time.split(':').map(Number);
    const currentTime = new Date().getHours() * 60 + new Date().getMinutes();
    const appointmentTime = hours * 60 + minutes;
    
    if (currentTime >= appointmentTime) {
      // Já passou do horário, agendar para a próxima semana/quinzena
      daysUntilNext = frequency === 'semanal' ? 7 : 14;
    }
  }
  
  // Se não encontrou um dia válido, usar o próximo intervalo
  if (daysUntilNext === 0) {
    daysUntilNext = frequency === 'semanal' ? 7 : 14;
  }
  
  // Calcular a primeira data de agendamento
  const firstDate = new Date(today);
  firstDate.setDate(today.getDate() + daysUntilNext);
  const [hours, minutes] = time.split(':').map(Number);
  firstDate.setHours(hours, minutes, 0, 0);
  
  const intervalDays = frequency === 'semanal' ? 7 : 14;
  
  // Gerar os agendamentos (inicialmente inativos - serão ativados em D-1)
  for (let i = 0; i < numAppointments; i++) {
    const appointmentDate = new Date(firstDate);
    appointmentDate.setDate(firstDate.getDate() + (i * intervalDays));
    
    // Calcular data de expiração: 2 horas antes do agendamento
    const expiresAt = new Date(appointmentDate);
    expiresAt.setHours(expiresAt.getHours() - 2);
    
    appointments.push({
      patient_id: patientId,
      professional_id: professionalId,
      appointment_date: appointmentDate.toISOString(),
      service_type: serviceType,
      status: 'pending_confirmation',
      is_active: false, // Inativo até ser ativado em D-1
      expires_at: expiresAt.toISOString(),
      notification_sent: false,
      notes: `Agendamento automático - ${frequency === 'semanal' ? 'Semanal' : 'Quinzenal'}`,
    });
  }
  
  // Inserir agendamentos um por um para garantir que todos sejam inseridos
  // e identificar quais falham (se houver)
  if (appointments.length > 0) {
    let successCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < appointments.length; i++) {
      const appointment = appointments[i];
      try {
        const { error } = await supabase
          .from('appointments')
          .insert([appointment]);
        
        if (error) {
          failedCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        failedCount++;
      }
    }
    
    if (failedCount > 0) {
      // Alguns agendamentos não puderam ser inseridos
    }
    
    // Não criar confirmações ainda - serão criadas quando os agendamentos forem ativados em D-1
    // As confirmações serão criadas pela rotina diária quando is_active = true
    return successCount;
  }
  
  return 0;
};

interface PatientFormProps {
  patientId?: string;
  onClose: () => void;
  onSave: () => void;
}

export function PatientForm({ patientId, onClose, onSave }: PatientFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [professionals, setProfessionals] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    document: '',
    address: '',
    emergency_contact: '',
    email: '',
    education_level: '',
    service_type: 'presencial' as 'online' | 'presencial' | 'ambos',
    consultation_price: '',
    responsible_name: '',
    responsible_document: '',
    responsible_phone: '',
    appointment_frequency: '' as 'semanal' | 'quinzenal' | '',
    appointment_day_of_week: '',
    appointment_time: '',
    appointment_count: '12', // Quantidade de agendamentos a gerar
    professional_id: '',
  });

  useEffect(() => {
    const initialize = async () => {
      await checkAdminStatus();
    };
    initialize();
  }, [user]);

  useEffect(() => {
    if (user) {
      loadProfessionals();
      if (patientId) {
        loadPatient();
      }
    }
  }, [patientId, isAdmin, user]);

  const checkAdminStatus = async () => {
    if (user) {
      const admin = await isSuperAdmin(user.id);
      setIsAdmin(admin);
    }
  };

  const loadProfessionals = async () => {
    try {
      // Se for super admin, carrega todos os profissionais
      // Se não for, carrega apenas o próprio profissional
      if (isAdmin) {
        const { data, error } = await supabase
          .from('professionals')
          .select('id, name')
          .eq('active', true)
          .order('name');

        if (error) throw error;
        setProfessionals(data || []);
      } else if (user) {
        // Para não-admin, carrega apenas o próprio profissional
        const { data, error } = await supabase
          .from('professionals')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('active', true)
          .single();

        if (error) throw error;
        if (data) {
          setProfessionals([data]);
          // Auto-vincular ao próprio profissional se não tiver professional_id e for novo paciente
          if (!formData.professional_id && !patientId) {
            setFormData(prev => ({ ...prev, professional_id: data.id }));
          }
        }
      }
    } catch (error: any) {
      // Erro ao carregar profissionais
    }
  };

  const loadPatient = async () => {
    if (!patientId) return;
    
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .maybeSingle();

    if (data) {
      setFormData({
        name: data.name,
        birth_date: data.birth_date,
        document: data.document,
        address: data.address,
        emergency_contact: data.emergency_contact,
        email: data.email,
        education_level: data.education_level,
        service_type: data.service_type,
        consultation_price: data.consultation_price || '',
        responsible_name: data.responsible_name || '',
        responsible_document: data.responsible_document || '',
        responsible_phone: data.responsible_phone || '',
        appointment_frequency: data.appointment_frequency || '',
        appointment_day_of_week: data.appointment_day_of_week?.toString() || '',
        appointment_time: data.appointment_time || '',
        appointment_count: '12', // Sempre começar com 12 ao editar
        professional_id: data.professional_id || '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validação dos campos obrigatórios
      if (!formData.name.trim()) {
        throw new Error('Nome é obrigatório');
      }
      if (!formData.consultation_price || parseFloat(formData.consultation_price) <= 0) {
        throw new Error('Valor da consulta é obrigatório e deve ser maior que zero');
      }
      if (!formData.emergency_contact.trim()) {
        throw new Error('Telefone é obrigatório');
      }
      if (!formData.appointment_day_of_week) {
        throw new Error('Dia de atendimento é obrigatório');
      }

      let savedPatientId = patientId;
      
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      // Preparar dados para salvar (converter tipos)
      // Excluir appointment_count pois não é uma coluna do banco, apenas configuração temporária
      const { appointment_count, ...formDataWithoutCount } = formData;
      
      // Se não for super admin, sempre vincular ao próprio profissional
      let professionalId = formData.professional_id || null;
      if (!isAdmin && user) {
        // Buscar o próprio professional_id
        const { data: professional } = await supabase
          .from('professionals')
          .select('id')
          .eq('user_id', user.id)
          .eq('active', true)
          .single();
        
        if (professional) {
          professionalId = professional.id;
        }
      }
      
      const patientData: any = {
        ...formDataWithoutCount,
        user_id: user.id, // Sempre definir user_id para passar na política RLS
        professional_id: professionalId,
        appointment_day_of_week: formData.appointment_day_of_week ? parseInt(formData.appointment_day_of_week) : null,
        appointment_frequency: formData.appointment_frequency || null,
        appointment_time: formData.appointment_time || null,
      };

      if (patientId) {
        const { error } = await supabase
          .from('patients')
          .update({ ...patientData, updated_at: new Date().toISOString() })
          .eq('id', patientId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('patients')
          .insert([patientData])
          .select('id')
          .single();

        if (error) throw error;
        if (!data?.id) throw new Error('Erro ao salvar paciente: ID não retornado');
        savedPatientId = data.id;
      }

      // Garantir que savedPatientId está definido
      if (!savedPatientId) {
        throw new Error('ID do paciente não disponível');
      }

      // Gerar agendamentos automáticos se frequência estiver configurada
      if (formData.appointment_frequency && 
          formData.appointment_day_of_week && 
          formData.appointment_time && 
          user) {
        const dayOfWeek = parseInt(formData.appointment_day_of_week);
        if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
          throw new Error('Dia da semana inválido');
        }

        // Type guards - já verificados no if acima
        const appointmentTime: string = formData.appointment_time!;
        const appointmentFrequency: 'semanal' | 'quinzenal' = formData.appointment_frequency!;

        // Verificar se já existem agendamentos futuros para este paciente
        const { data: existingAppointments } = await supabase
          .from('appointments')
          .select('id')
          .eq('patient_id', savedPatientId)
          .eq('status', 'pending_confirmation')
          .gte('appointment_date', new Date().toISOString())
          .limit(1);

        // Só gerar se não houver agendamentos futuros pendentes
        if (!existingAppointments || existingAppointments.length === 0) {
          const numAppointments = parseInt(formData.appointment_count || '12');
          const validCount = isNaN(numAppointments) || numAppointments < 1 ? 12 : Math.min(numAppointments, 52);
          const serviceType = formData.service_type === 'ambos' ? 'presencial' : (formData.service_type || 'presencial');
          
          await generateRecurringAppointments(
            savedPatientId,
            user.id,
            appointmentFrequency,
            dayOfWeek,
            appointmentTime,
            serviceType,
            validCount
          );
        }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] my-4 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            {patientId ? 'Editar Paciente' : 'Novo Paciente'}
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
              Nome Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data de Nascimento
              </label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CPF/RG
              </label>
              <input
                type="text"
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Endereço
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefone <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Escolaridade
              </label>
              <select
                value={formData.education_level}
                onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione...</option>
                <option value="fundamental">Ensino Fundamental</option>
                <option value="medio">Ensino Médio</option>
                <option value="superior">Ensino Superior</option>
                <option value="pos-graduacao">Pós-Graduação</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Atendimento
              </label>
              <select
                value={formData.service_type}
                onChange={(e) => setFormData({ ...formData, service_type: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="presencial">Presencial</option>
                <option value="online">Online</option>
                <option value="ambos">Ambos</option>
              </select>
            </div>
          </div>

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profissional Responsável
              </label>
              <select
                value={formData.professional_id}
                onChange={(e) => setFormData({ ...formData, professional_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione um profissional...</option>
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Apenas super administradores podem definir o profissional responsável
              </p>
            </div>
          )}
          
          {!isAdmin && professionals.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profissional Responsável
              </label>
              <input
                type="text"
                value={professionals[0].name}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Paciente será automaticamente vinculado a você
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valor da Consulta (R$) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={formData.consultation_price}
              onChange={(e) => setFormData({ ...formData, consultation_price: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: 150.00"
            />
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Agendamento Recorrente
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Configure agendamentos automáticos para este paciente. O sistema gerará automaticamente os próximos agendamentos baseado na frequência escolhida.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frequência da Consulta
                </label>
                <select
                  value={formData.appointment_frequency}
                  onChange={(e) => setFormData({ ...formData, appointment_frequency: e.target.value as 'semanal' | 'quinzenal' | '' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione a frequência...</option>
                  <option value="semanal">Semanal</option>
                  <option value="quinzenal">Quinzenal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dia da Semana <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.appointment_day_of_week}
                  onChange={(e) => setFormData({ ...formData, appointment_day_of_week: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione o dia...</option>
                  <option value="0">Domingo</option>
                  <option value="1">Segunda-feira</option>
                  <option value="2">Terça-feira</option>
                  <option value="3">Quarta-feira</option>
                  <option value="4">Quinta-feira</option>
                  <option value="5">Sexta-feira</option>
                  <option value="6">Sábado</option>
                </select>
              </div>

              {formData.appointment_frequency && (
                <>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horário Fixo
                    </label>
                    <input
                      type="time"
                      value={formData.appointment_time}
                      onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantidade de Agendamentos
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="52"
                      value={formData.appointment_count}
                      onChange={(e) => setFormData({ ...formData, appointment_count: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="12"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Quantos agendamentos você deseja criar? (1 a 52)
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Dados do Responsável (Opcional - Para Menores de Idade)
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Responsável
                </label>
                <input
                  type="text"
                  value={formData.responsible_name}
                  onChange={(e) => setFormData({ ...formData, responsible_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome completo do responsável"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF/RG do Responsável
                  </label>
                  <input
                    type="text"
                    value={formData.responsible_document}
                    onChange={(e) => setFormData({ ...formData, responsible_document: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Documento do responsável"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone do Responsável
                  </label>
                  <input
                    type="text"
                    value={formData.responsible_phone}
                    onChange={(e) => setFormData({ ...formData, responsible_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm sm:text-base order-2 sm:order-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm sm:text-base order-1 sm:order-2"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
