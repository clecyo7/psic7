import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import { HomePage } from './components/Home/HomePage';
import { LoginForm } from './components/Auth/LoginForm';
import { DashboardView } from './components/Dashboard/DashboardView';
import { PatientList } from './components/Patients/PatientList';
import { AppointmentList } from './components/Appointments/AppointmentList';
import { MedicalRecordsList } from './components/MedicalRecords/MedicalRecordsList';
import { FinancialManagement } from './components/Financial/FinancialManagement';
import { ReportsList } from './components/Reports/ReportsList';
import { ProfessionalList } from './components/Professionals/ProfessionalList';
import { AdminPanel } from './components/Admin/AdminPanel';
import { Logo } from './components/Logo';
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  DollarSign,
  BarChart3,
  LogOut,
  Menu,
  X,
  UserCheck,
  Shield,
} from 'lucide-react';

function AppContent() {
  const { user, signOut, loading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Verificar se há hash na URL (callback do Supabase após confirmação de email)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      // Limpar o hash da URL
      window.history.replaceState(null, '', window.location.pathname);
      setEmailConfirmed(true);
      // O Supabase processa automaticamente o token, então o usuário será autenticado
      setTimeout(() => setEmailConfirmed(false), 5000);
    }
  }, []);

  // Verificar se a rota é /acesso para mostrar o login diretamente
  useEffect(() => {
    if (window.location.pathname === '/acesso') {
      setShowLogin(true);
    } else if (window.location.pathname !== '/' && !user) {
      // Se estiver em outra rota sem estar logado, redirecionar para home
      window.history.replaceState(null, '', '/');
    }
  }, [user]);

  // Verificar se usuário é super admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('professionals')
          .select('is_super_admin, active')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Erro ao verificar super admin:', error);
          setIsSuperAdmin(false);
          return;
        }

        if (data) {
          // Verificar se é super admin E está ativo
          const isAdmin = (data.is_super_admin === true) && (data.active === true);
          setIsSuperAdmin(isAdmin);
          console.log('Super admin status:', { is_super_admin: data.is_super_admin, active: data.active, result: isAdmin });
        } else {
          setIsSuperAdmin(false);
        }
      } catch (error) {
        console.error('Erro ao verificar super admin:', error);
        setIsSuperAdmin(false);
      }
    };

    checkSuperAdmin();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  // Mostrar mensagem de sucesso se o email foi confirmado
  if (emailConfirmed && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-3xl">✓</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Email Confirmado!</h2>
          <p className="text-gray-600 mb-4">Sua conta foi confirmada com sucesso.</p>
          <button
            onClick={() => setEmailConfirmed(false)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showLogin || window.location.pathname === '/acesso') {
      return <LoginForm />;
    }
    return <HomePage onLoginClick={() => setShowLogin(true)} />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Pacientes', icon: Users },
    { id: 'professionals', label: 'Profissionais', icon: UserCheck },
    { id: 'appointments', label: 'Agendamentos', icon: Calendar },
    { id: 'records', label: 'Prontuários', icon: FileText },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    ...(isSuperAdmin ? [{ id: 'admin', label: 'Administração', icon: Shield }] : []),
  ];

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'patients':
        return <PatientList />;
      case 'professionals':
        return <ProfessionalList />;
      case 'appointments':
        return <AppointmentList />;
      case 'records':
        return <MedicalRecordsList />;
      case 'financial':
        return <FinancialManagement />;
      case 'reports':
        return <ReportsList />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">Sistema de Gestão</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out z-50 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 w-64 lg:w-64`}
      >
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Logo width={40} height={30} />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Psi Cloud</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Sistema de Gestão</p>
            </div>
          </div>
        </div>

        <nav className="p-3 sm:p-4 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition text-sm sm:text-base ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 border-t border-gray-200 bg-white">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-red-600 hover:bg-red-50 transition text-sm sm:text-base"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        />
      )}

      <main className="lg:ml-64 pt-14 sm:pt-16 lg:pt-0 p-3 sm:p-4 lg:p-6 xl:p-8">
        {renderView()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
