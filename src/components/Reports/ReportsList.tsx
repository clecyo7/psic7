import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Edit, Trash2, Plus, Eye, X, FileDown } from 'lucide-react';
import { ReportForm } from './ReportForm';
import { generateReportPDF } from './PDFReportGenerator';

interface Report {
  id: string;
  title: string;
  content: string;
  report_date: string;
  report_type: string;
  created_at: string;
  updated_at: string;
  patient: {
    id: string;
    name: string;
  };
}

export function ReportsList() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReportId, setEditingReportId] = useState<string | undefined>();
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPatient, setFilterPatient] = useState<string>('all');

  useEffect(() => {
    loadReports();
  }, [user, filterType, filterPatient]);

  const loadReports = async () => {
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          patient:patients(id, name)
        `)
        .eq('professional_id', user?.id)
        .order('report_date', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('report_type', filterType);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      if (filterPatient !== 'all') {
        filteredData = filteredData.filter((r: any) => r.patient_id === filterPatient);
      }

      setReports(filteredData);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (reportId: string) => {
    setEditingReportId(reportId);
    setShowForm(true);
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Tem certeza que deseja excluir este relatório?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId)
        .eq('professional_id', user?.id);

      if (error) throw error;
      alert('Relatório excluído com sucesso!');
      loadReports();
    } catch (error: any) {
      alert('Erro ao excluir relatório: ' + error.message);
    }
  };

  const handleView = (report: Report) => {
    setViewingReport(report);
  };

  const handleGeneratePDF = async (report: Report) => {
    try {
      // Buscar informações completas do paciente
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('name, birth_date, document, professional_id')
        .eq('id', report.patient.id)
        .single();

      if (patientError) {
        console.warn('Erro ao buscar dados do paciente:', patientError);
        // Continuar mesmo sem dados completos do paciente
        await generateReportPDF(report);
        return;
      }

      const patientInfo = {
        name: patientData.name,
        birth_date: patientData.birth_date,
        document: patientData.document,
        professional_id: patientData.professional_id,
      };

      // Buscar informações do profissional se houver
      let professionalInfo = undefined;
      if (patientData.professional_id) {
        const { data: professionalData, error: professionalError } = await supabase
          .from('professionals')
          .select('name')
          .eq('id', patientData.professional_id)
          .single();

        if (!professionalError && professionalData) {
          professionalInfo = {
            name: professionalData.name,
          };
        }
      }

      await generateReportPDF(report, patientInfo, professionalInfo);
    } catch (error: any) {
      alert('Erro ao gerar PDF: ' + error.message);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingReportId(undefined);
  };

  const handleSave = () => {
    loadReports();
  };

  const getReportTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      geral: 'Geral',
      avaliacao: 'Avaliação',
      evolucao: 'Evolução',
      alta: 'Alta',
      outro: 'Outro',
    };
    return labels[type] || type;
  };

  const getReportTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      geral: 'bg-blue-100 text-blue-800',
      avaliacao: 'bg-purple-100 text-purple-800',
      evolucao: 'bg-green-100 text-green-800',
      alta: 'bg-yellow-100 text-yellow-800',
      outro: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  // Obter lista única de pacientes para filtro
  const uniquePatients = Array.from(
    new Map(
      reports.map((r) => [r.patient.id, r.patient])
    ).values()
  );

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Relatórios</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Gerencie seus relatórios</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          Novo Relatório
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Tipo
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os tipos</option>
              <option value="geral">Geral</option>
              <option value="avaliacao">Avaliação</option>
              <option value="evolucao">Evolução</option>
              <option value="alta">Alta</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Paciente
            </label>
            <select
              value={filterPatient}
              onChange={(e) => setFilterPatient(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos os pacientes</option>
              {uniquePatients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center">
          <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
            Nenhum relatório encontrado
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            {filterType !== 'all' || filterPatient !== 'all'
              ? 'Nenhum relatório corresponde aos filtros selecionados'
              : 'Comece criando seu primeiro relatório'}
          </p>
          {(filterType === 'all' && filterPatient === 'all') && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              Criar Primeiro Relatório
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl shadow-md p-4 sm:p-6 hover:shadow-lg transition"
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="text-base sm:text-lg font-bold text-gray-800 break-words">
                      {report.title}
                    </h3>
                    <span
                      className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium w-fit ${getReportTypeColor(
                        report.report_type
                      )}`}
                    >
                      {getReportTypeLabel(report.report_type)}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>Paciente:</strong> {report.patient.name}
                    </p>
                    <p>
                      <strong>Data:</strong>{' '}
                      {new Date(report.report_date).toLocaleDateString('pt-BR')}
                    </p>
                    <p>
                      <strong>Criado em:</strong>{' '}
                      {new Date(report.created_at).toLocaleString('pt-BR')}
                    </p>
                    {report.updated_at !== report.created_at && (
                      <p>
                        <strong>Atualizado em:</strong>{' '}
                        {new Date(report.updated_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                  <button
                    onClick={() => handleGeneratePDF(report)}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                    title="Gerar PDF"
                    aria-label="Gerar PDF"
                  >
                    <FileDown className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => handleView(report)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Ver Relatório"
                    aria-label="Ver Relatório"
                  >
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(report.id)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                    title="Editar Relatório"
                    aria-label="Editar Relatório"
                  >
                    <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Excluir Relatório"
                    aria-label="Excluir Relatório"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
              {report.content.trim() !== '' && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap break-words line-clamp-3">
                    {report.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <ReportForm
          reportId={editingReportId}
          onClose={handleCloseForm}
          onSave={handleSave}
        />
      )}

      {viewingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 z-10">
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-800 break-words">
                    {viewingReport.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getReportTypeColor(
                        viewingReport.report_type
                      )}`}
                    >
                      {getReportTypeLabel(viewingReport.report_type)}
                    </span>
                    <span className="text-xs sm:text-sm text-gray-600">
                      {viewingReport.patient.name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setViewingReport(null)}
                  className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                <p>
                  <strong>Data do Relatório:</strong>{' '}
                  {new Date(viewingReport.report_date).toLocaleDateString('pt-BR')}
                </p>
                <p>
                  <strong>Criado em:</strong>{' '}
                  {new Date(viewingReport.created_at).toLocaleString('pt-BR')}
                </p>
                {viewingReport.updated_at !== viewingReport.created_at && (
                  <p>
                    <strong>Atualizado em:</strong>{' '}
                    {new Date(viewingReport.updated_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button
                  onClick={() => handleGeneratePDF(viewingReport)}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-xs sm:text-sm"
                >
                  <FileDown className="w-4 h-4" />
                  Gerar PDF
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="prose max-w-none">
                <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                  <p className="text-sm sm:text-base text-gray-700 whitespace-pre-wrap break-words">
                    {viewingReport.content}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

