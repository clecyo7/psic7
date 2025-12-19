import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Edit, Eye, X, FileDown, Printer, PenTool, CheckCircle2 } from 'lucide-react';
import { generatePDFReport } from './PDFReportGenerator';

interface MedicalRecord {
  id: string;
  record_date: string;
  content: string;
  signed: boolean;
  signed_at: string | null;
  professional_name: string | null;
  professional_registration: string | null;
  patient: {
    name: string;
    id: string;
  };
  appointment: {
    appointment_date: string;
    service_type: string;
  } | null;
}

export function MedicalRecordsList() {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [editContent, setEditContent] = useState('');
  const [viewingConsolidated, setViewingConsolidated] = useState<string | null>(null);
  const [consolidatedRecords, setConsolidatedRecords] = useState<MedicalRecord[]>([]);
  const [signRecord, setSignRecord] = useState(false);
  const [professionalName, setProfessionalName] = useState('');
  const [professionalRegistration, setProfessionalRegistration] = useState('');

  useEffect(() => {
    loadRecords();
  }, [user]);

  const loadRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          *,
          patient:patients(id, name),
          appointment:appointments(appointment_date, service_type)
        `)
        .eq('professional_id', user?.id)
        .order('record_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: MedicalRecord) => {
    if (record.signed) {
      alert('Este prontuário já foi assinado e não pode mais ser editado.');
      return;
    }
    setEditingRecord(record);
    setEditContent(record.content);
    setSignRecord(false);
    setProfessionalName('');
    setProfessionalRegistration('');
  };

  const handleSave = async () => {
    if (!editingRecord) return;

    if (signRecord) {
      if (!professionalName.trim()) {
        alert('Por favor, informe seu nome completo para assinar o prontuário.');
        return;
      }
      if (!editContent.trim()) {
        alert('O prontuário deve ser preenchido antes de ser assinado.');
        return;
      }
    }

    try {
      const updateData: any = {
        content: editContent,
        updated_at: new Date().toISOString(),
      };

      if (signRecord) {
        updateData.signed = true;
        updateData.signed_at = new Date().toISOString();
        updateData.professional_name = professionalName;
        updateData.professional_registration = professionalRegistration || null;
      }

      const { error } = await supabase
        .from('medical_records')
        .update(updateData)
        .eq('id', editingRecord.id);

      if (error) throw error;

      setEditingRecord(null);
      setEditContent('');
      setSignRecord(false);
      setProfessionalName('');
      setProfessionalRegistration('');
      loadRecords();

      if (signRecord) {
        alert('Prontuário salvo e assinado com sucesso!');
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleViewConsolidated = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          *,
          patient:patients(id, name),
          appointment:appointments(appointment_date, service_type)
        `)
        .eq('patient_id', patientId)
        .eq('professional_id', user?.id)
        .order('record_date', { ascending: true });

      if (error) throw error;
      setConsolidatedRecords(data || []);
      setViewingConsolidated(patientId);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleGeneratePDF = () => {
    if (consolidatedRecords.length === 0) return;
    const filledRecords = consolidatedRecords.filter(r => r.content.trim() !== '');
    if (filledRecords.length === 0) {
      alert('Não há prontuários preenchidos para gerar o relatório.');
      return;
    }
    generatePDFReport(filledRecords, consolidatedRecords[0].patient.name);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusColor = (record: MedicalRecord) => {
    if (record.content.trim() === '') return 'bg-yellow-100 border-yellow-300';
    if (record.signed) return 'bg-green-100 border-green-300';
    return 'bg-blue-100 border-blue-300';
  };

  const getStatusText = (record: MedicalRecord) => {
    if (record.content.trim() === '') return 'Aguardando Preenchimento';
    if (record.signed) return 'Preenchido e Assinado';
    return 'Preenchido';
  };

  const getStatusBadgeColor = (record: MedicalRecord) => {
    if (record.content.trim() === '') return 'bg-yellow-200 text-yellow-800';
    if (record.signed) return 'bg-green-200 text-green-800';
    return 'bg-blue-200 text-blue-800';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Prontuários</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Evolução e histórico dos pacientes</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center">
          <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Nenhum prontuário</h3>
          <p className="text-sm sm:text-base text-gray-600">Conclua atendimentos para criar prontuários</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {records.map((record) => (
            <div
              key={record.id}
              className={`bg-white rounded-xl shadow-md p-4 sm:p-6 hover:shadow-lg transition border-2 ${getStatusColor(record)}`}
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0 mb-3">
                <div className="flex-1 w-full sm:w-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800">{record.patient.name}</h3>
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusBadgeColor(record)}`}>
                      {record.signed && <CheckCircle2 className="w-3 h-3" />}
                      {getStatusText(record)}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>Data da Consulta:</strong>{' '}
                      {record.appointment
                        ? new Date(record.appointment.appointment_date).toLocaleString('pt-BR')
                        : 'Não vinculado'}
                    </p>
                    {record.appointment && (
                      <p>
                        <strong>Tipo:</strong>{' '}
                        <span className="capitalize">{record.appointment.service_type}</span>
                      </p>
                    )}
                    <p>
                      <strong>Criado em:</strong>{' '}
                      {new Date(record.record_date).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                  <button
                    onClick={() => handleViewConsolidated(record.patient.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Ver Prontuário Consolidado"
                    aria-label="Ver Prontuário Consolidado"
                  >
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  {!record.signed && (
                    <button
                      onClick={() => handleEdit(record)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                      title="Editar Prontuário"
                      aria-label="Editar Prontuário"
                    >
                      <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                </div>
              </div>
              {record.content.trim() !== '' && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap break-words">{record.content}</p>
                  {record.signed && record.professional_name && (
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <PenTool className="w-4 h-4 text-green-600" />
                        <span className="font-medium">Assinado por:</span>
                        <span>{record.professional_name}</span>
                        {record.professional_registration && (
                          <span>- {record.professional_registration}</span>
                        )}
                      </div>
                      {record.signed_at && (
                        <p className="text-xs text-gray-500 mt-1 ml-6">
                          {new Date(record.signed_at).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] my-4 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between rounded-t-xl z-10">
              <div className="flex-1 min-w-0 pr-2">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                  {editContent.trim() === '' ? 'Preencher Prontuário' : 'Editar Prontuário'}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                  {editingRecord.patient.name} - {' '}
                  {editingRecord.appointment
                    ? new Date(editingRecord.appointment.appointment_date).toLocaleDateString('pt-BR')
                    : 'Sem consulta vinculada'}
                </p>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evolução do Paciente
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={10}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Descreva a evolução do paciente, diagnóstico, tratamento, observações..."
              />

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={signRecord}
                    onChange={(e) => setSignRecord(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="font-medium text-gray-700">Assinar este prontuário digitalmente</span>
                </label>
                <p className="text-xs text-gray-600 mt-2 ml-6">
                  Ao assinar, o prontuário não poderá mais ser editado.
                </p>

                {signRecord && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome Completo do Profissional *
                      </label>
                      <input
                        type="text"
                        value={professionalName}
                        onChange={(e) => setProfessionalName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: Dr. João Silva"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CRM / Registro Profissional
                      </label>
                      <input
                        type="text"
                        value={professionalRegistration}
                        onChange={(e) => setProfessionalRegistration(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ex: CRM 12345/SP"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 sm:mt-6">
                <button
                  onClick={() => {
                    setEditingRecord(null);
                    setSignRecord(false);
                    setProfessionalName('');
                    setProfessionalRegistration('');
                  }}
                  className="px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm sm:text-base order-2 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm sm:text-base order-1 sm:order-2"
                >
                  {signRecord && <PenTool className="w-4 h-4" />}
                  {signRecord ? 'Salvar e Assinar' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingConsolidated && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] my-4 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 z-10">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Prontuário Consolidado</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                    {consolidatedRecords[0]?.patient.name} - Histórico Completo
                  </p>
                </div>
                <button
                  onClick={() => setViewingConsolidated(null)}
                  className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 print:hidden">
                <button
                  onClick={handleGeneratePDF}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs sm:text-sm"
                >
                  <FileDown className="w-4 h-4" />
                  Gerar PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-xs sm:text-sm"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {consolidatedRecords.length === 0 ? (
                <p className="text-center text-sm sm:text-base text-gray-600 py-8">Nenhum prontuário encontrado</p>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {consolidatedRecords.map((record, index) => (
                    <div key={record.id} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-gray-800">
                              Consulta {index + 1}
                            </p>
                            {record.signed && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Assinado
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {record.appointment
                              ? new Date(record.appointment.appointment_date).toLocaleString('pt-BR')
                              : new Date(record.record_date).toLocaleString('pt-BR')}
                            {record.appointment && (
                              <span className="ml-2 capitalize">
                                - {record.appointment.service_type === 'online' ? 'Online' : 'Presencial'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      {record.content.trim() === '' ? (
                        <p className="text-yellow-600 italic mt-2">Aguardando preenchimento</p>
                      ) : (
                        <>
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-2">Evolução:</p>
                            <p className="text-gray-700 whitespace-pre-wrap">{record.content}</p>
                          </div>
                          {record.signed && record.professional_name && (
                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-2 text-sm">
                                <PenTool className="w-4 h-4 text-green-600" />
                                <span className="font-medium text-gray-700">Assinatura Digital:</span>
                              </div>
                              <div className="mt-2 ml-6 text-sm text-gray-700">
                                <p className="font-medium">{record.professional_name}</p>
                                {record.professional_registration && (
                                  <p className="text-gray-600">{record.professional_registration}</p>
                                )}
                                {record.signed_at && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Assinado em: {new Date(record.signed_at).toLocaleString('pt-BR')}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {index < consolidatedRecords.length - 1 && (
                        <hr className="mt-6 border-gray-200" />
                      )}
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
