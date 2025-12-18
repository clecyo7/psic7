import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, CheckCircle, Edit, X, Trash2 } from 'lucide-react';

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

export function FinancialManagement() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    due_date: '',
    status: '',
  });

  useEffect(() => {
    loadTransactions();
  }, [user]);

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          patient:patients(name)
        `)
        .eq('professional_id', user?.id)
        .order('due_date', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Financeiro</h1>
        <p className="text-gray-600 mt-1">Controle financeiro do consultório</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">A Receber</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                R$ {totalPending.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {transactions.filter(t => t.status === 'pending').length} transação(ões)
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Recebido</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                R$ {totalReceived.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {transactions.filter(t => t.status === 'received').length} transação(ões)
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Contas a Receber</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhuma transação</h3>
            <p className="text-gray-600">As transações aparecerão aqui após concluir atendimentos</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="p-6 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">
                        {transaction.patient.name}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {getStatusText(transaction.status)}
                      </span>
                    </div>
                    {transaction.description && (
                      <p className="text-sm text-gray-600 mb-2">{transaction.description}</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Valor:</span>
                        <p className="font-bold text-gray-800">
                          R$ {parseFloat(transaction.amount.toString()).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Vencimento:</span>
                        <p className="font-medium text-gray-800">
                          {new Date(transaction.due_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      {transaction.paid_date && (
                        <div>
                          <span className="text-gray-600">Pago em:</span>
                          <p className="font-medium text-gray-800">
                            {new Date(transaction.paid_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Editar Transação</h2>
              <button
                onClick={() => setEditingTransaction(null)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
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

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setEditingTransaction(null)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
