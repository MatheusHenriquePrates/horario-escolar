import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="fixed top-4 right-4 z-50 p-3 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-lg"
            title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
        >
            {theme === 'light' ? (
                <Moon className="w-5 h-5 text-gray-800" />
            ) : (
                <Sun className="w-5 h-5 text-yellow-300" />
            )}
        </button>
    );
}
