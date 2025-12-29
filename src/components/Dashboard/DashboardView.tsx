import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { isSuperAdmin } from '../../lib/superAdmin';
import { Calendar, Users, DollarSign, FileText, TrendingUp } from 'lucide-react';
import { AppointmentCalendar } from '../Calendar/AppointmentCalendar';

interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  monthRevenue: number;
  pendingPayments: number;
  confirmedAppointments: number;
  completedAppointments: number;
}

export function DashboardView() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    monthRevenue: 0,
    pendingPayments: 0,
    confirmedAppointments: 0,
    completedAppointments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, [user]);

  const loadDashboardStats = async () => {
    try {
      const userIsSuperAdmin = await isSuperAdmin(user?.id);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Criar queries base
      let todayApptsQuery = supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('appointment_date', today.toISOString())
        .lt('appointment_date', tomorrow.toISOString());

      let monthRevenueQuery = supabase
        .from('financial_transactions')
        .select('amount')
        .eq('status', 'received')
        .gte('paid_date', firstDayOfMonth.toISOString().split('T')[0])
        .lte('paid_date', lastDayOfMonth.toISOString().split('T')[0]);

      let pendingQuery = supabase
        .from('financial_transactions')
        .select('amount')
        .eq('status', 'pending');

      let confirmedQuery = supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed');

      let completedQuery = supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      // Aplicar filtro de professional_id apenas se não for super admin
      if (!userIsSuperAdmin) {
        todayApptsQuery = todayApptsQuery.eq('professional_id', user?.id);
        monthRevenueQuery = monthRevenueQuery.eq('professional_id', user?.id);
        pendingQuery = pendingQuery.eq('professional_id', user?.id);
        confirmedQuery = confirmedQuery.eq('professional_id', user?.id);
        completedQuery = completedQuery.eq('professional_id', user?.id);
      }

      const [patientsRes, todayApptsRes, monthRevenueRes, pendingRes, confirmedRes, completedRes] = await Promise.all([
        supabase
          .from('patients')
          .select('id', { count: 'exact', head: true }),
        todayApptsQuery,
        monthRevenueQuery,
        pendingQuery,
        confirmedQuery,
        completedQuery,
      ]);

      const monthRevenue = monthRevenueRes.data?.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0) || 0;
      const pendingPayments = pendingRes.data?.reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0) || 0;

      setStats({
        totalPatients: patientsRes.count || 0,
        todayAppointments: todayApptsRes.count || 0,
        monthRevenue,
        pendingPayments,
        confirmedAppointments: confirmedRes.count || 0,
        completedAppointments: completedRes.count || 0,
      });
    } catch (error) {
      // Erro ao carregar estatísticas do dashboard
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

  const statCards = [
    { title: 'Total de Pacientes', value: stats.totalPatients, icon: Users, color: 'bg-blue-500' },
    { title: 'Atendimentos Hoje', value: stats.todayAppointments, icon: Calendar, color: 'bg-green-500' },
    { title: 'Receita do Mês', value: `R$ ${stats.monthRevenue.toFixed(2)}`, icon: DollarSign, color: 'bg-emerald-500' },
    { title: 'Pagamentos Pendentes', value: `R$ ${stats.pendingPayments.toFixed(2)}`, icon: TrendingUp, color: 'bg-orange-500' },
    { title: 'Agendamentos Confirmados', value: stats.confirmedAppointments, icon: FileText, color: 'bg-purple-500' },
    { title: 'Atendimentos Concluídos', value: stats.completedAppointments, icon: FileText, color: 'bg-teal-500' },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Visão geral do consultório</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-md p-4 sm:p-6 hover:shadow-lg transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{card.title}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-2 break-words">{card.value}</p>
              </div>
              <div className={`${card.color} p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2`}>
                <card.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Calendário de Agendamentos */}
      <div className="mt-6">
        <AppointmentCalendar />
      </div>
    </div>
  );
}
