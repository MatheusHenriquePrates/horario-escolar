import { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { RegistrationContainer } from './components/registration/RegistrationContainer';
import { SchedulePage } from './pages/SchedulePage';
import { LoginPage } from './pages/LoginPage';
import { ThemeProvider } from './contexts/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import { useAuthStore } from './hooks/useAuthStore';
import { Loader2 } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'registration' | 'schedule'>('registration');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const { user, token, checkAuth } = useAuthStore();

  // Verificar autenticação ao carregar
  useEffect(() => {
    const verify = async () => {
      if (token) {
        await checkAuth();
      }
      setIsCheckingAuth(false);
    };
    verify();
  }, []);

  // Tela de loading enquanto verifica autenticação
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
          <p className="text-slate-400 mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não está logado, mostra tela de login
  if (!user || !token) {
    return <LoginPage onLoginSuccess={() => window.location.reload()} />;
  }

  // Se está logado, mostra o sistema
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <ThemeToggle />
        <Layout activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === 'registration' ? <RegistrationContainer /> : <SchedulePage />}
        </Layout>
      </div>
    </ThemeProvider>
  );
}

export default App;
