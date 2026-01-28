import { useMemo } from 'react';
import { useScheduleStore } from '../../hooks/useScheduleStore';
import { SCHOOL_CONFIG } from '../../utils/autoDistributor';
import type { SubjectName } from '../../types';
import { Lock } from 'lucide-react';

const ALL_SUBJECTS: SubjectName[] = [
    'Português', 'Matemática', 'História', 'Geografia', 'Ciências',
    'Inglês', 'Educação Física', 'Artes', 'Educação Digital',
    'Educação Financeira', 'Educação Ambiental', 'Ensino Religioso',
    'Projeto de Vida', 'Estudo Orientado'
];

interface Props {
    selectedSubjects: SubjectName[];
    onChange: (subjects: SubjectName[]) => void;
}

export function SubjectCheckboxList({ selectedSubjects, onChange }: Props) {
    const { teachers } = useScheduleStore();

    // Calcular ocupação de cada disciplina
    const subjectOccupancy = useMemo(() => {
        const occupancy = new Map<string, { turmasOcupadas: Set<string>; totalTurmas: number }>();

        ALL_SUBJECTS.forEach(subject => {
            occupancy.set(subject, {
                turmasOcupadas: new Set(),
                totalTurmas: SCHOOL_CONFIG.TURMAS.length
            });
        });

        teachers.forEach(teacher => {
            teacher.allocations.forEach(allocation => {
                const data = occupancy.get(allocation.subject);
                if (data) {
                    allocation.classes.forEach(classId => {
                        data.turmasOcupadas.add(classId);
                    });
                }
            });
        });

        return occupancy;
    }, [teachers]);

    const handleToggle = (subject: SubjectName) => {
        const data = subjectOccupancy.get(subject);
        const isFull = data ? data.turmasOcupadas.size >= data.totalTurmas : false;

        // Se está cheia, não permitir selecionar (a menos que já esteja selecionada e queiramos desmarcar)
        if (isFull && !selectedSubjects.includes(subject)) {
            return;
        }

        if (selectedSubjects.includes(subject)) {
            onChange(selectedSubjects.filter(s => s !== subject));
        } else {
            onChange([...selectedSubjects, subject]);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Disciplinas que leciona:
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ALL_SUBJECTS.map(subject => {
                    const data = subjectOccupancy.get(subject);
                    const turmasOcupadas = data?.turmasOcupadas.size || 0;
                    const totalTurmas = data?.totalTurmas || 18;
                    const isFull = turmasOcupadas >= totalTurmas;
                    const isSelected = selectedSubjects.includes(subject);

                    return (
                        <label
                            key={subject}
                            className={`
                                flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all
                                ${isFull && !isSelected
                                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-60'
                                    : isSelected
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600'
                                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                                }
                            `}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggle(subject)}
                                disabled={isFull && !isSelected}
                                className="rounded text-blue-600 disabled:opacity-50"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                    <span className={`text-sm ${isFull && !isSelected ? 'text-gray-500 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200 font-medium'}`}>
                                        {subject}
                                    </span>
                                    {isFull && <Lock className="w-3 h-3 text-gray-400 dark:text-gray-500" />}
                                </div>
                                {turmasOcupadas > 0 && (
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 flex justify-between mt-1">
                                        <span>{turmasOcupadas}/{totalTurmas} turmas</span>
                                        {isFull && <span className="text-red-500 dark:text-red-400 font-bold">FECHADO</span>}
                                    </div>
                                )}
                            </div>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
