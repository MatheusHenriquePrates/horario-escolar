import React from 'react';
import { useScheduleStore } from '../../hooks/useScheduleStore';
import { ALL_CLASSES, WEEKDAYS, SUBJECT_ABBREVIATIONS } from '../../types';

const HORARIOS = [
    { id: 0, nome: '1ª', hora: '07:30-08:20' },
    { id: 1, nome: '2ª', hora: '08:20-09:10' },
    { id: 2, nome: '3ª', hora: '09:30-10:20' },
    { id: 3, nome: '4ª', hora: '10:20-11:10' },
    { id: 4, nome: '5ª', hora: '11:10-12:00' },
    { id: 5, nome: '6ª', hora: '13:30-14:20' },
    { id: 6, nome: '7ª', hora: '14:20-15:10' },
];

const AULAS_POR_DIA: Record<number, number> = { 0: 7, 1: 7, 2: 7, 3: 7, 4: 6 };

export function FullScheduleGrid() {
    const { schedule, teachers } = useScheduleStore();

    const getTeacherName = (teacherId: string) => {
        const teacher = teachers.find(t => t.id === teacherId);
        return teacher?.name.split(' ')[0]?.toUpperCase() || '?';
    };

    const getTeacherColor = (teacherId: string) => {
        return teachers.find(t => t.id === teacherId)?.color || '#f3f4f6';
    };

    const getAbbr = (subject: string) => {
        return SUBJECT_ABBREVIATIONS[subject] || subject.slice(0, 3).toUpperCase();
    };

    return (
        <div className="space-y-8">
            {/* Para cada dia da semana */}
            {WEEKDAYS.map((dia, dayIdx) => (
                <div key={dia} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                    {/* Header do Dia */}
                    <div className={`p-4 text-white font-bold text-xl ${dayIdx === 4 ? 'bg-orange-500 dark:bg-orange-600' : 'bg-blue-600 dark:bg-blue-700'}`}>
                        {dia.toUpperCase()}
                        {dayIdx === 4 && <span className="text-sm font-normal ml-2">(Até 6ª aula)</span>}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-gray-700">
                                    <th className="p-2 border dark:border-gray-600 text-left w-20 dark:text-white">Aula</th>
                                    {ALL_CLASSES.map(turma => (
                                        <th
                                            key={turma}
                                            className={`p-2 border dark:border-gray-600 text-center min-w-[80px] dark:text-white ${turma.startsWith('6') ? 'bg-blue-50 dark:bg-blue-900/30' :
                                                    turma.startsWith('7') ? 'bg-green-50 dark:bg-green-900/30' :
                                                        turma.startsWith('8') ? 'bg-yellow-50 dark:bg-yellow-900/30' :
                                                            'bg-purple-50 dark:bg-purple-900/30'
                                                }`}
                                        >
                                            {turma}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {HORARIOS.map((horario) => {
                                    const slotId = horario.id;
                                    const isDisabled = slotId >= AULAS_POR_DIA[dayIdx];

                                    // Linha de intervalo após 2ª aula
                                    const showRecreioBefore = slotId === 2;
                                    // Linha de almoço após 5ª aula
                                    const showAlmocoBefore = slotId === 5;

                                    return (
                                        <React.Fragment key={`slot-${dayIdx}-${slotId}`}>
                                            {showRecreioBefore && (
                                                <tr key={`recreio-${dayIdx}-${slotId}`} className="bg-amber-50 dark:bg-amber-900/30">
                                                    <td className="p-1 border dark:border-gray-600 text-center font-bold text-amber-700 dark:text-amber-400 text-xs">
                                                        RECREIO
                                                    </td>
                                                    <td colSpan={ALL_CLASSES.length} className="p-1 border dark:border-gray-600 text-center text-amber-600 dark:text-amber-300 text-xs">
                                                        09:10 - 09:30
                                                    </td>
                                                </tr>
                                            )}
                                            {showAlmocoBefore && (
                                                <tr key={`almoco-${dayIdx}-${slotId}`} className="bg-green-50 dark:bg-green-900/30">
                                                    <td className="p-1 border dark:border-gray-600 text-center font-bold text-green-700 dark:text-green-400 text-xs">
                                                        ALMOÇO
                                                    </td>
                                                    <td colSpan={ALL_CLASSES.length} className="p-1 border dark:border-gray-600 text-center text-green-600 dark:text-green-300 text-xs">
                                                        12:00 - 13:30
                                                    </td>
                                                </tr>
                                            )}
                                            <tr key={`aula-${dayIdx}-${slotId}`}>
                                                <td className="p-2 border dark:border-gray-600 bg-slate-50 dark:bg-gray-700 font-medium dark:text-white">
                                                    <div>{horario.nome}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{horario.hora}</div>
                                                </td>
                                                {ALL_CLASSES.map(turma => {
                                                    if (isDisabled) {
                                                        return (
                                                            <td key={turma} className="p-1 border dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-center text-gray-300 dark:text-gray-600">
                                                                —
                                                            </td>
                                                        );
                                                    }

                                                    const lesson = schedule[dayIdx]?.[slotId]?.[turma];

                                                    if (!lesson) {
                                                        return (
                                                            <td key={turma} className="p-1 border dark:border-gray-600 text-center text-gray-200 dark:text-gray-700">
                                                                •
                                                            </td>
                                                        );
                                                    }

                                                    return (
                                                        <td
                                                            key={turma}
                                                            className="p-1 border dark:border-gray-600 text-center"
                                                            style={{ backgroundColor: getTeacherColor(lesson.teacherId) }}
                                                        >
                                                            <div className="font-bold text-slate-800 text-xs">
                                                                {getAbbr(lesson.subject)}
                                                            </div>
                                                            <div className="text-[10px] text-slate-600">
                                                                {getTeacherName(lesson.teacherId)}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}
