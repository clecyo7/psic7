import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { isSuperAdmin } from '../../lib/superAdmin';
import { DollarSign, CheckCircle, Edit, X, Trash2, TrendingUp, Calendar } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  status: string;
  due_date: string;
  paid_date: string | null;
  description: string;
  patient: {
    name: string;
  };
}

interface RevenueEstimate {
  totalPatients: number;
  totalMonthlyRevenue: number;
  totalWeeklyRevenue: number;
  totalBiweeklyRevenue: number;
  patientsWithPrice: number;
  patientsWithoutPrice: number;
}

export function FinancialManagement() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenueEstimate, setRevenueEstimate] = useState<RevenueEstimate | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    due_date: '',
    status: '',
  });

  useEffect(() => {
    loadTransactions();
    loadRevenueEstimate();
  }, [user]);

  const loadTransactions = async () => {
    try {
      const userIsSuperAdmin = await isSuperAdmin(user?.id);
      
      let query = supabase
        .from('financial_transactions')
        .select(`
          *,
          patient:patients(name)
        `);

      // Se não for super admin, filtrar apenas as próprias transações
      if (!userIsSuperAdmin) {
        query = query.eq('professional_id', user?.id);
      }

      const { data, error } = await query.order('due_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      // Erro ao carregar transações
    } finally {
      setLoading(false);
    }
  };

  const loadRevenueEstimate = async () => {
    try {
      const userIsSuperAdmin = await isSuperAdmin(user?.id);
      
      let patientsQuery = supabase
        .from('patients')
        .select('id, consultation_price, appointment_frequency, active');

      // Se não for super admin, filtrar apenas pacientes do próprio profissional
      if (!userIsSuperAdmin && user) {
        const { data: professional } = await supabase
          .from('professionals')
          .select('id')
          .eq('user_id', user.id)
          .eq('active', true)
          .single();

        if (professional) {
          patientsQuery = patientsQuery.eq('professional_id', professional.id);
        } else {
          setRevenueEstimate({
            totalPatients: 0,
            totalMonthlyRevenue: 0,
            totalWeeklyRevenue: 0,
            totalBiweeklyRevenue: 0,
            patientsWithPrice: 0,
            patientsWithoutPrice: 0,
          });
          return;
        }
      }

      const { data: patients, error } = await patientsQuery;

      if (error) throw error;

      // Calcular estimativas
      const activePatients = (patients || []).filter(p => p.active !== false);
      const patientsWithPrice = activePatients.filter(p => p.consultation_price && parseFloat(p.consultation_price.toString()) > 0);
      const patientsWithoutPrice = activePatients.length - patientsWithPrice.length;

      // Calcular receita semanal (pacientes com frequência semanal)
      const weeklyPatients = patientsWithPrice.filter(p => p.appointment_frequency === 'semanal');
      const totalWeeklyRevenue = weeklyPatients.reduce((sum, p) => {
        return sum + parseFloat(p.consultation_price?.toString() || '0');
      }, 0);

      // Calcular receita quinzenal (pacientes com frequência quinzenal)
      const biweeklyPatients = patientsWithPrice.filter(p => p.appointment_frequency === 'quinzenal');
      const totalBiweeklyRevenue = biweeklyPatients.reduce((sum, p) => {
        return sum + parseFloat(p.consultation_price?.toString() || '0');
      }, 0);

      // Calcular receita mensal
      // Semanal: 4 consultas por mês
      // Quinzenal: 2 consultas por mês
      // Sem frequência definida: assumir 1 consulta por mês
      const patientsWithoutFrequency = patientsWithPrice.filter(
        p => p.appointment_frequency !== 'semanal' && p.appointment_frequency !== 'quinzenal'
      );
      const monthlyFromWeekly = totalWeeklyRevenue * 4;
      const monthlyFromBiweekly = totalBiweeklyRevenue * 2;
      const monthlyFromOthers = patientsWithoutFrequency.reduce((sum, p) => {
        return sum + parseFloat(p.consultation_price?.toString() || '0');
      }, 0);

      const totalMonthlyRevenue = monthlyFromWeekly + monthlyFromBiweekly + monthlyFromOthers;

      setRevenueEstimate({
        totalPatients: activePatients.length,
        totalMonthlyRevenue,
        totalWeeklyRevenue,
        totalBiweeklyRevenue,
        patientsWithPrice: patientsWithPrice.length,
        patientsWithoutPrice,
      });
    } catch (error) {
      // Erro ao carregar estimativa
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditForm({
      amount: transaction.amount.toString(),
      due_date: transaction.due_date,
      status: transaction.status,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    try {
      const updateData: any = {
        amount: parseFloat(editForm.amount),
        due_date: editForm.due_date,
        status: editForm.status,
        updated_at: new Date().toISOString(),
      };

      if (editForm.status === 'received' && editingTransaction.status !== 'received') {
        updateData.paid_date = new Date().toISOString().split('T')[0];
      } else if (editForm.status !== 'received') {
        updateData.paid_date = null;
      }

      const { error } = await supabase
        .from('financial_transactions')
        .update(updateData)
        .eq('id', editingTransaction.id);

      if (error) throw error;

      setEditingTransaction(null);
      loadTransactions();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleMarkAsPaid = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .update({
          status: 'received',
          paid_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (error) throw error;
      loadTransactions();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleCancel = async (transactionId: string) => {
    if (!confirm('Deseja realmente cancelar esta transação?')) return;

    try {
      const { error } = await supabase
        .from('financial_transactions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (error) throw error;
      loadTransactions();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'received': return 'Recebido';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const totalPending = transactions
    .filter(t => t.status === 'pending')
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const totalReceived = transactions
    .filter(t => t.status === 'received')
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Financeiro</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Controle financeiro do consultório</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">A Receber</p>
              <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-2 break-words">
                R$ {totalPending.toFixed(2)}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {transactions.filter(t => t.status === 'pending').length} transação(ões)
              </p>
            </div>
            <div className="bg-orange-100 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Recebido</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-2 break-words">
                R$ {totalReceived.toFixed(2)}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {transactions.filter(t => t.status === 'received').length} transação(ões)
              </p>
            </div>
            <div className="bg-green-100 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
              <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
            </div>
          </div>
        </div>

        {revenueEstimate && (
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Previsão Mensal
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-2 break-words">
                  R$ {revenueEstimate.totalMonthlyRevenue.toFixed(2)}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  {revenueEstimate.patientsWithPrice} de {revenueEstimate.totalPatients} pacientes
                </p>
                {revenueEstimate.patientsWithoutPrice > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    {revenueEstimate.patientsWithoutPrice} sem valor definido
                  </p>
                )}
              </div>
              <div className="bg-blue-100 p-2 sm:p-3 rounded-lg flex-shrink-0 ml-2">
                <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card de Detalhes da Previsão */}
      {revenueEstimate && revenueEstimate.totalPatients > 0 && (
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Estimativa de Receita
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total de Pacientes</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-1">
                {revenueEstimate.totalPatients}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Com Valor Definido</p>
              <p className="text-xl sm:text-2xl font-bold text-green-700 mt-1">
                {revenueEstimate.patientsWithPrice}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Receita Semanal</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-700 mt-1">
                R$ {revenueEstimate.totalWeeklyRevenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Receita Quinzenal</p>
              <p className="text-xl sm:text-2xl font-bold text-indigo-700 mt-1">
                R$ {revenueEstimate.totalBiweeklyRevenue.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600">
              <strong>Como funciona:</strong> A previsão mensal considera a frequência de consultas de cada paciente:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Pacientes com frequência <strong>semanal</strong>: 4 consultas por mês</li>
                <li>Pacientes com frequência <strong>quinzenal</strong>: 2 consultas por mês</li>
                <li>Pacientes sem frequência definida: 1 consulta por mês</li>
              </ul>
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">Contas a Receber</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <DollarSign className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Nenhuma transação</h3>
            <p className="text-sm sm:text-base text-gray-600">As transações aparecerão aqui após concluir atendimentos</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="p-4 sm:p-6 hover:bg-gray-50 transition">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-base sm:text-lg font-bold text-gray-800">
                        {transaction.patient.name}
                      </h3>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium w-fit ${getStatusColor(transaction.status)}`}>
                        {getStatusText(transaction.status)}
                      </span>
                    </div>
                    {transaction.description && (
                      <p className="text-xs sm:text-sm text-gray-600 mb-2 break-words">{transaction.description}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                      <div>
                        <span className="text-gray-600 block mb-1">Valor:</span>
                        <p className="font-bold text-gray-800">
                          R$ {parseFloat(transaction.amount.toString()).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600 block mb-1">Vencimento:</span>
                        <p className="font-medium text-gray-800">
                          {new Date(transaction.due_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      {transaction.paid_date && (
                        <div>
                          <span className="text-gray-600 block mb-1">Pago em:</span>
                          <p className="font-medium text-gray-800">
                            {new Date(transaction.paid_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:ml-4 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                    {transaction.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleMarkAsPaid(transaction.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Marcar como Recebido"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleCancel(transaction.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Cancelar"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    {transaction.status === 'received' && (
                      <button
                        onClick={() => handleEdit(transaction)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[95vh] my-4 overflow-y-auto">
            <div className="sticky top-0 bg-white px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between z-10">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Editar Transação</h2>
              <button
                onClick={() => setEditingTransaction(null)}
                className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paciente
                </label>
                <input
                  type="text"
                  disabled
                  value={editingTransaction.patient.name}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Vencimento
                </label>
                <input
                  type="date"
                  required
                  value={editForm.due_date}
                  onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  required
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pending">Pendente</option>
                  <option value="received">Recebido</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  onClick={() => setEditingTransaction(null)}
                  className="px-4 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm sm:text-base order-2 sm:order-1"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm sm:text-base order-1 sm:order-2"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
