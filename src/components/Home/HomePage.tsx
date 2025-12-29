import { Brain, Heart, Shield, Users, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Logo } from '../Logo';

interface HomePageProps {
  onLoginClick: () => void;
}

export function HomePage({ onLoginClick }: HomePageProps) {
  const handleAgendarConsulta = () => {
    const phoneNumber = '5561982039671'; // +55 61 98203-9671 sem formatação
    const message = encodeURIComponent('Olá! Gostaria de agendar uma consulta.');
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo width={50} height={37} className="flex-shrink-0" />
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Psi Cloud</h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Psicologia e Bem-Estar</p>
              </div>
            </div>
            {/* Botão de acesso profissional oculto - Acesso via ?login=true na URL */}
            <button
              onClick={onLoginClick}
              className="hidden"
              aria-hidden="true"
            >
              Acesso Profissional
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 lg:pt-20 pb-16 sm:pb-24 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium">
              <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="whitespace-nowrap">Cuidando da sua saúde mental</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-900 leading-tight">
              Sua jornada para o
              <span className="text-blue-600"> bem-estar</span> começa aqui
            </h2>

            <p className="text-base sm:text-lg lg:text-xl text-gray-600 leading-relaxed">
              Oferecemos acompanhamento psicológico profissional, acolhedor e personalizado
              para ajudá-lo a superar desafios e alcançar uma vida mais equilibrada.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
              <button 
                onClick={handleAgendarConsulta}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-base sm:text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              >
                Agendar Consulta
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-base sm:text-lg border-2 border-gray-200">
                Saiba Mais
              </button>
            </div>
          </div>

          <div className="relative mt-8 lg:mt-0">
            <div className="relative z-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl">
              <img
                src="https://images.pexels.com/photos/7176026/pexels-photo-7176026.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Terapia profissional"
                className="rounded-lg w-full h-64 sm:h-80 lg:h-96 object-cover"
              />
            </div>
            <div className="absolute top-2 sm:top-4 -left-2 sm:-left-4 w-48 h-48 sm:w-72 sm:h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
            <div className="absolute bottom-2 sm:bottom-4 -right-2 sm:-right-4 w-48 h-48 sm:w-72 sm:h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16 lg:py-20 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12 lg:mb-16">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Por que escolher nossa clínica?
            </h3>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
              Comprometidos com excelência no cuidado à saúde mental
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 sm:p-8 rounded-2xl border border-blue-200 hover:shadow-lg transition">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Sigilo Garantido</h4>
              <p className="text-sm sm:text-base text-gray-600">
                Total confidencialidade e privacidade em todas as sessões e informações
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 sm:p-8 rounded-2xl border border-green-200 hover:shadow-lg transition">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Equipe Qualificada</h4>
              <p className="text-sm sm:text-base text-gray-600">
                Psicólogos experientes e registrados no CRP com diversas especialidades
              </p>
            </div>

            <div className="bg-gradient-to-br from-sky-50 to-sky-100 p-6 sm:p-8 rounded-2xl border border-sky-200 hover:shadow-lg transition">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-sky-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                <Calendar className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Horários Flexíveis</h4>
              <p className="text-sm sm:text-base text-gray-600">
                Atendimento em diversos horários para se adequar à sua rotina
              </p>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 sm:p-8 rounded-2xl border border-teal-200 hover:shadow-lg transition">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-teal-600 rounded-xl flex items-center justify-center mb-4 sm:mb-6">
                <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Atendimento Ágil</h4>
              <p className="text-sm sm:text-base text-gray-600">
                Resposta rápida e agendamento facilitado para iniciar seu tratamento
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="bg-gradient-to-br from-blue-600 to-green-600 rounded-2xl sm:rounded-3xl p-8 sm:p-12 lg:p-16 text-center text-white shadow-2xl">
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">
            Pronto para cuidar da sua saúde mental?
          </h3>
          <p className="text-base sm:text-lg lg:text-xl mb-6 sm:mb-8 text-blue-50 max-w-2xl mx-auto">
            Agende sua primeira consulta e dê o primeiro passo para uma vida mais equilibrada e feliz
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={handleAgendarConsulta}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium text-base sm:text-lg flex items-center gap-2 shadow-lg w-full sm:w-auto"
            >
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              Agendar Consulta
            </button>
            <div className="flex items-center gap-2 text-blue-50 text-sm sm:text-base">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Resposta em até 24 horas</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-300 py-8 sm:py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Logo width={40} height={30} />
                <h4 className="text-white font-bold text-lg">Psi Cloud</h4>
              </div>
              <p className="text-gray-400">
                Cuidando da sua saúde mental com profissionalismo e empatia
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Contato</h4>
              <div className="space-y-2 text-gray-400">
                <p>Tel: (61) 98203-9671</p>
                <p>Email: contato@mentesaudavel.com.br</p>
                <p>Seg-Sex: 8h às 18h</p>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Localização</h4>
              <p className="text-gray-400">
                Av. Principal, 1234<br />
                Bairro Centro<br />
                São Paulo - SP
              </p>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-500">
            <p>&copy; 2024 Psi Cloud. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
