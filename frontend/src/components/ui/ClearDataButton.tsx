import { Trash2 } from 'lucide-react';
import { Button } from './Button';

export function ClearDataButton() {
    const handleClearAll = () => {
        if (!confirm('⚠️  ATENÇÃO!\n\nIsto vai limpar TODOS os dados do navegador (professores, grades, etc).\n\nVocê terá que cadastrar tudo novamente!\n\nTem certeza?')) {
            return;
        }

        // Limpa localStorage
        localStorage.clear();

        // Limpa sessionStorage
        sessionStorage.clear();

        alert('✅ Dados limpos! A página será recarregada.');

        // Recarrega a página
        window.location.reload();
    };

    return (
        <Button
            onClick={handleClearAll}
            variant="outline"
            className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30"
        >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Cache
        </Button>
    );
}
