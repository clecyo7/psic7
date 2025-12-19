import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Calendar, DollarSign, Users, TrendingUp } from 'lucide-react';

export function ReportsView() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    totalPatients: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    appointmentsByMonth: [] as any[],
    revenueByMonth: [] as any[],
  });

  useEffect(() => {
    loadReportData();
  }, [user]);

  const loadReportData = async () => {
    try {
      const [appointmentsRes, transactionsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*')
          .eq('professional_id', user?.id),
        supabase
          .from('financial_transactions')
          .select('*')
          .eq('professional_id', user?.id),
      ]);

      const appointments = appointmentsRes.data || [];
      const transactions = transactionsRes.data || [];

      const uniquePatients = new Set(appointments.map(a => a.patient_id));
      const completed = appointments.filter(a => a.status === 'completed').length;
      const cancelled = appointments.filter(a => a.status === 'cancelled').length;

      const totalRevenue = transactions
        .filter(t => t.status === 'received')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const pendingRevenue = transactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const appointmentsByMonth: any = {};
      appointments.forEach(apt => {
        const date = new Date(apt.appointment_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        appointmentsByMonth[monthKey] = (appointmentsByMonth[monthKey] || 0) + 1;
      });

      const revenueByMonth: any = {};
      transactions
        .filter(t => t.status === 'received' && t.paid_date)
        .forEach(t => {
          const date = new Date(t.paid_date!);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + parseFloat(t.amount);
        });

      setReportData({
        totalPatients: uniquePatients.size,
        totalAppointments: appointments.length,
        completedAppointments: completed,
        cancelledAppointments: cancelled,
        totalRevenue,
        pendingRevenue,
        appointmentsByMonth: Object.entries(appointmentsByMonth).map(([month, count]) => ({
          month,
          count,
        })),
        revenueByMonth: Object.entries(revenueByMonth).map(([month, revenue]) => ({
          month,
          revenue,
        })),
      });
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
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
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Relatórios</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Análise detalhada do consultório</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total de Pacientes</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2 break-words">{reportData.totalPatients}</p>
            </div>
            <div className="bg-blue-100 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total de Agendamentos</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2 break-words">{reportData.totalAppointments}</p>
            </div>
            <div className="bg-green-100 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Atendimentos Concluídos</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2 break-words">{reportData.completedAppointments}</p>
            </div>
            <div className="bg-emerald-100 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Receita Total</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-800 mt-2 break-words">
                R$ {reportData.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-purple-100 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            Agendamentos por Mês
          </h2>
          <div className="space-y-3">
            {reportData.appointmentsByMonth.length === 0 ? (
              <p className="text-gray-600 text-center py-8">Nenhum dado disponível</p>
            ) : (
              reportData.appointmentsByMonth.slice(-6).map((item) => (
                <div key={item.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700 font-medium">
                    {new Date(item.month + '-01').toLocaleDateString('pt-BR', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-blue-600 font-bold">{item.count} agendamentos</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            Receita por Mês
          </h2>
          <div className="space-y-3">
            {reportData.revenueByMonth.length === 0 ? (
              <p className="text-gray-600 text-center py-8">Nenhum dado disponível</p>
            ) : (
              reportData.revenueByMonth.slice(-6).map((item) => (
                <div key={item.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700 font-medium">
                    {new Date(item.month + '-01').toLocaleDateString('pt-BR', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                  <span className="text-green-600 font-bold">R$ {parseFloat(item.revenue).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Resumo Geral</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Estatísticas de Agendamentos</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total de Agendamentos:</span>
                <span className="font-bold text-gray-800">{reportData.totalAppointments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Concluídos:</span>
                <span className="font-bold text-green-600">{reportData.completedAppointments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cancelados:</span>
                <span className="font-bold text-red-600">{reportData.cancelledAppointments}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taxa de Conclusão:</span>
                <span className="font-bold text-blue-600">
                  {reportData.totalAppointments > 0
                    ? ((reportData.completedAppointments / reportData.totalAppointments) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Estatísticas Financeiras</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Receita Total:</span>
                <span className="font-bold text-green-600">R$ {reportData.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">A Receber:</span>
                <span className="font-bold text-orange-600">R$ {reportData.pendingRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Receita Projetada:</span>
                <span className="font-bold text-blue-600">
                  R$ {(reportData.totalRevenue + reportData.pendingRevenue).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
