import type { ReactNode } from 'react';
import { Calendar, Users, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../hooks/useAuthStore';
import { NotificationBell } from '../ui/NotificationBell';

interface LayoutProps {
    children: ReactNode;
    activeTab: 'registration' | 'schedule';
    onTabChange: (tab: 'registration' | 'schedule') => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        if (confirm('Deseja realmente sair do sistema?')) {
            logout();
            window.location.reload();
        }
    };

    const getRoleName = (role: string) => {
        switch (role) {
            case 'admin': return 'Administrador';
            case 'coordenador': return 'Coordenador';
            case 'professor': return 'Professor';
            default: return role;
        }
    };

    return (
        <div className="min-h-screen bg-background dark:bg-gray-900 flex flex-col">
            <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 dark:bg-primary/20 p-2 rounded-lg">
                                <Calendar className="h-6 w-6 text-primary dark:text-primary" />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                Horário Escolar <span className="text-primary">Inteligente</span>
                            </h1>
                        </div>

                        <div className="flex items-center gap-4">
                            <nav className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                                <button
                                    onClick={() => onTabChange('registration')}
                                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'registration'
                                        ? 'bg-white dark:bg-gray-600 text-primary shadow-sm'
                                        : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100'
                                        }`}
                                >
                                    <Users className="w-4 h-4 mr-2" />
                                    Cadastro
                                </button>
                                <button
                                    onClick={() => onTabChange('schedule')}
                                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'schedule'
                                        ? 'bg-white dark:bg-gray-600 text-primary shadow-sm'
                                        : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100'
                                        }`}
                                >
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Grade
                                </button>
                            </nav>

                            <NotificationBell />

                            {/* Usuário logado */}
                            <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-600">
                                <div className="flex items-center gap-2 text-sm">
                                    <div className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                                            {user?.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {user && getRoleName(user.role)}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                    title="Sair"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                {children}
            </main>

            <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 mt-auto">
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                    <p>© {new Date().getFullYear()} Sistema de Horários Escolares. Desenvolvido para testes.</p>
                </div>
            </footer>
        </div>
    );
}
