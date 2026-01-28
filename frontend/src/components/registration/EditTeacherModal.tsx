import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { Teacher, SubjectName } from '../../types';

interface EditTeacherModalProps {
    teacher: Teacher;
    isOpen: boolean;
    onClose: () => void;
    onSave: (teacherId: string, updates: Partial<Teacher>) => Promise<void>;
}

export function EditTeacherModal({ teacher, isOpen, onClose, onSave }: EditTeacherModalProps) {
    const [name, setName] = useState(teacher.name);
    const [workload, setWorkload] = useState(teacher.workloadMonthly);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setName(teacher.name);
        setWorkload(teacher.workloadMonthly);
    }, [teacher]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(teacher.id, { name, workloadMonthly: workload });
            onClose();
        } catch (error) {
            console.error('Erro ao salvar:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Calcular aulas atuais
    const totalAulas = teacher.allocations.reduce(
        (acc, a) => acc + (a.lessonsPerWeek * a.classes.length), 0
    );

    return (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Editar Professor</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 dark:text-gray-300" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                    <Input
                        label="Nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    <Input
                        label="Carga Horária Mensal"
                        type="number"
                        value={workload}
                        onChange={(e) => setWorkload(Number(e.target.value))}
                        min={40}
                        max={200}
                    />

                    {/* Resumo das alocações */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <h3 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Disciplinas Alocadas</h3>
                        <div className="space-y-1">
                            {teacher.allocations.map((a, i) => (
                                <div key={i} className="text-sm flex justify-between dark:text-gray-300">
                                    <span>{a.subject}</span>
                                    <span className="text-gray-500 dark:text-gray-400">
                                        {a.classes.length} turmas ({a.lessonsPerWeek * a.classes.length} aulas)
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 pt-2 border-t dark:border-gray-600 text-sm font-medium dark:text-gray-200">
                            Total: {totalAulas} aulas/semana
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        * Para alterar disciplinas, delete o professor e cadastre novamente.
                    </p>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                    <Button onClick={onClose} variant="outline">
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar
                    </Button>
                </div>
            </div>
        </div>
    );
}
