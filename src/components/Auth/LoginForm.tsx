import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn } from 'lucide-react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResendEmail, setShowResendEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const { signIn, signUp, resendConfirmationEmail } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        setSignUpSuccess(true);
        // Se o signup foi bem-sucedido, tentar fazer login automaticamente após 1 segundo
        setTimeout(async () => {
          try {
            await signIn(email, password);
          } catch (err) {
            // Se não conseguir fazer login automaticamente, mostrar mensagem
            setSignUpSuccess(false);
          }
        }, 1000);
      } else {
        await signIn(email, password);
      }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-blue-600 p-3 rounded-full">
            <LogIn className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
          {isSignUp ? 'Criar Conta' : 'Entrar'}
        </h2>
        <p className="text-center text-gray-600 mb-8">
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

        {signUpSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
            Conta criada com sucesso! Fazendo login...
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
            {loading ? 'Processando...' : isSignUp ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}
