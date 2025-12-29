import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { LogIn } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResendEmail, setShowResendEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const { signIn, resendConfirmationEmail } = useAuth();

  // Função para criar profissional a partir de dados pendentes
  const createProfessionalFromPending = async () => {
    const pendingData = localStorage.getItem('pending_professional');
    if (!pendingData) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const professionalData = JSON.parse(pendingData);
      
      // Verificar se já existe profissional para este usuário
      const { data: existing } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Já existe, apenas atualizar
        await supabase
          .from('professionals')
          .update({
            ...professionalData,
            email: professionalData.email || user.email || null,
          })
          .eq('user_id', user.id);
      } else {
        // Criar novo
        await supabase
          .from('professionals')
          .insert({
            user_id: user.id,
            ...professionalData,
            email: professionalData.email || user.email || null,
            active: true,
          });
      }

      // Remover dados pendentes
      localStorage.removeItem('pending_professional');
    } catch (error) {
      console.error('Erro ao criar profissional pendente:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      // Após login bem-sucedido, verificar se há profissional pendente
      await createProfessionalFromPending();
    } catch (err: any) {
      const errorMessage = err.message || 'Ocorreu um erro';

      if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('too many')) {
        setError('Muitas tentativas. Por favor, aguarde alguns minutos e tente novamente.');
      } else if (errorMessage.includes('Email rate limit exceeded')) {
        setError('Limite de tentativas excedido para este e-mail. Aguarde alguns minutos.');
      } else if (errorMessage.includes('E-mail não confirmado') || errorMessage.includes('Email not confirmed')) {
        setError('E-mail não confirmado. Verifique sua caixa de entrada e clique no link de confirmação.');
        setShowResendEmail(true);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      setError('Por favor, insira seu e-mail primeiro.');
      return;
    }

    setLoading(true);
    setError('');
    setResendSuccess(false);

    try {
      await resendConfirmationEmail(email);
      setResendSuccess(true);
      setShowResendEmail(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao reenviar e-mail de confirmação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-blue-600 p-3 rounded-full">
            <LogIn className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-2">
          Entrar
        </h2>
        <p className="text-center text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
          Sistema de Gestão de Consultório
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
            <p>{error}</p>
            {showResendEmail && (
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={loading}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline disabled:opacity-50"
              >
                Reenviar e-mail de confirmação
              </button>
            )}
          </div>
        )}

        {resendSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
            E-mail de confirmação reenviado! Verifique sua caixa de entrada.
          </div>
        )}


        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>


          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Não tem conta? Entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
