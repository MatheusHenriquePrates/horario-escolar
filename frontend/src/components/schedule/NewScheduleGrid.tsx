import { useState, useMemo } from 'react';
import { useScheduleStore } from '../../hooks/useScheduleStore';
import { Card } from '../ui/Card';
import { ALL_CLASSES, WEEKDAYS, SUBJECT_ABBREVIATIONS, LESSONS_PER_DAY } from '../../types';
import { AlertTriangle, CheckCircle, User, Users, Grid3X3 } from 'lucide-react';

// Horários - TEMPO INTEGRAL
const HORARIOS = [
    { id: 0, nome: '1ª Aula', hora: '07:30 - 08:20', periodo: 'manhã' },
    { id: 1, nome: '2ª Aula', hora: '08:20 - 09:10', periodo: 'manhã' },
    { id: 'recreio', nome: 'RECREIO', hora: '09:10 - 09:30', tipo: 'break' },
    { id: 2, nome: '3ª Aula', hora: '09:30 - 10:20', periodo: 'manhã' },
    { id: 3, nome: '4ª Aula', hora: '10:20 - 11:10', periodo: 'manhã' },
    { id: 4, nome: '5ª Aula', hora: '11:10 - 12:00', periodo: 'manhã' },
    { id: 'almoco', nome: 'ALMOÇO', hora: '12:00 - 13:30', tipo: 'break' },
    { id: 5, nome: '6ª Aula', hora: '13:30 - 14:20', periodo: 'tarde' },
    { id: 6, nome: '7ª Aula', hora: '14:20 - 15:10', periodo: 'tarde' },
];

const AULAS_POR_DIA: Record<number, number> = { 0: 7, 1: 7, 2: 7, 3: 7, 4: 6 };

interface Props {
    viewMode: 'all' | 'class' | 'teacher';
    selectedClass?: string;
    selectedTeacher?: string;
}

export function NewScheduleGrid({ viewMode, selectedClass, selectedTeacher }: Props) {
    const { schedule, teachers } = useScheduleStore();

    const getTeacherColor = (teacherId: string) =>
        teachers.find(t => t.id === teacherId)?.color || '#e5e7eb';

    const getTeacherName = (teacherId: string) =>
        teachers.find(t => t.id === teacherId)?.name.split(' ')[0] || '?';

    const getSubjectAbbr = (subject: string) =>
        SUBJECT_ABBREVIATIONS[subject] || subject.slice(0, 4).toUpperCase();

    const isSlotDisabled = (day: number, slot: number) => slot >= AULAS_POR_DIA[day];

    // ==========================================
    // VISÃO POR TURMA (Uma turma específica)
    // ==========================================
    if (viewMode === 'class' && selectedClass) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                {/* Header da Turma */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white p-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6" />
                        Horário da Turma {selectedClass}
                    </h2>
                    <p className="text-blue-100 dark:text-blue-200 text-sm mt-1">Ensino Fundamental II - Tempo Integral</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className="bg-slate-800 dark:bg-gray-900 text-white p-3 text-sm font-bold w-28">
                                    HORÁRIO
                                </th>
                                {WEEKDAYS.map((day, idx) => (
                                    <th
                                        key={day}
                                        className={`text-white p-3 text-sm font-bold text-center ${idx === 4 ? 'bg-orange-500 dark:bg-orange-600' : 'bg-blue-600 dark:bg-blue-700'
                                            }`}
                                    >
                                        {day.toUpperCase()}
                                        {idx === 4 && <div className="text-xs font-normal opacity-80">Até 6ª aula</div>}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {HORARIOS.map((horario) => {
                                // Intervalo (Recreio/Almoço)
                                if (horario.tipo === 'break') {
                                    const isAlmoco = horario.id === 'almoco';
                                    return (
                                        <tr key={horario.id} className={isAlmoco ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}>
                                            <td className={`p-2 text-center font-bold border-r ${isAlmoco ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30' : 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30'}`}>
                                                <div className="text-sm">{horario.nome}</div>
                                                <div className="text-xs font-normal opacity-70">{horario.hora}</div>
                                            </td>
                                            <td colSpan={5} className={`p-4 text-center font-bold text-lg tracking-wider ${isAlmoco ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                {isAlmoco ? '🍽️ ALMOÇO 🍽️' : '☕ RECREIO ☕'}
                                            </td>
                                        </tr>
                                    );
                                }

                                const slotId = horario.id as number;

                                return (
                                    <tr key={horario.id} className="hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="bg-slate-100 dark:bg-gray-700 p-2 text-center border-r border-slate-200 dark:border-gray-600">
                                            <div className="font-bold text-slate-700 dark:text-gray-200">{horario.nome}</div>
                                            <div className="text-xs text-slate-500 dark:text-gray-400">{horario.hora}</div>
                                        </td>
                                        {WEEKDAYS.map((_, dayIdx) => {
                                            // Slot bloqueado (7ª aula na sexta)
                                            if (isSlotDisabled(dayIdx, slotId)) {
                                                return (
                                                    <td key={dayIdx} className="bg-gray-100 dark:bg-gray-800 p-3 text-center border border-slate-200 dark:border-gray-600">
                                                        <span className="text-gray-300 dark:text-gray-600 text-xl">—</span>
                                                    </td>
                                                );
                                            }

                                            const lesson = schedule[dayIdx]?.[slotId]?.[selectedClass];

                                            if (!lesson) {
                                                return (
                                                    <td key={dayIdx} className="bg-white dark:bg-gray-800 p-3 text-center border border-slate-200 dark:border-gray-600">
                                                        <span className="text-gray-200 dark:text-gray-700">•</span>
                                                    </td>
                                                );
                                            }

                                            const bgColor = getTeacherColor(lesson.teacherId);

                                            return (
                                                <td
                                                    key={dayIdx}
                                                    className="p-2 text-center border border-slate-200 dark:border-gray-600 transition-all hover:scale-105"
                                                    style={{ backgroundColor: bgColor }}
                                                >
                                                    <div className="font-bold text-slate-800 text-lg">
                                                        {getSubjectAbbr(lesson.subject)}
                                                    </div>
                                                    <div className="text-xs text-slate-600 mt-1 flex items-center justify-center gap-1">
                                                        <div
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: bgColor, filter: 'brightness(0.6)' }}
                                                        />
                                                        {getTeacherName(lesson.teacherId)}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // ==========================================
    // VISÃO POR PROFESSOR - CORRIGIDA
    // ==========================================
    if (viewMode === 'teacher' && selectedTeacher) {
        const teacher = teachers.find(t => t.id === selectedTeacher);
        if (!teacher) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Professor não encontrado</div>;

        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                {/* Header do Professor */}
                <div
                    className="p-4"
                    style={{ backgroundColor: teacher.color }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold bg-white/30 text-white"
                        >
                            {teacher.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-white">
                            <h2 className="text-2xl font-bold">{teacher.name}</h2>
                            <p className="text-sm opacity-80">{teacher.workloadMonthly}h/mês</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className="bg-slate-800 dark:bg-gray-900 text-white p-3 text-sm font-bold w-28">HORÁRIO</th>
                                {WEEKDAYS.map((day, idx) => (
                                    <th key={day} className={`text-white p-3 text-sm font-bold ${idx === 4 ? 'bg-orange-500 dark:bg-orange-600' : 'bg-blue-600 dark:bg-blue-700'}`}>
                                        {day.toUpperCase()}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {HORARIOS.map((horario) => {
                                if (horario.tipo === 'break') {
                                    const isAlmoco = horario.id === 'almoco';
                                    return (
                                        <tr key={horario.id} className={isAlmoco ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}>
                                            <td className={`p-2 text-center font-bold ${isAlmoco ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30' : 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30'}`}>
                                                {horario.nome}
                                                <div className="text-xs font-normal opacity-70">{horario.hora}</div>
                                            </td>
                                            <td colSpan={5} className={`p-3 text-center font-bold ${isAlmoco ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                {horario.nome}
                                            </td>
                                        </tr>
                                    );
                                }

                                const slotId = horario.id as number;

                                return (
                                    <tr key={horario.id}>
                                        <td className="bg-slate-100 dark:bg-gray-700 p-2 text-center border-r dark:border-gray-600">
                                            <div className="font-bold text-slate-700 dark:text-gray-200 text-sm">{horario.nome}</div>
                                            <div className="text-xs text-slate-500 dark:text-gray-400">{horario.hora}</div>
                                        </td>
                                        {[0, 1, 2, 3, 4].map((dayIdx) => {
                                            // Sexta sem 7ª aula
                                            if (dayIdx === 4 && slotId >= 6) {
                                                return <td key={dayIdx} className="bg-gray-100 dark:bg-gray-800 text-center text-gray-300 dark:text-gray-600 p-2">—</td>;
                                            }

                                            // Buscar aulas do professor neste slot
                                            const aulasNoSlot: { classId: string; subject: string }[] = [];

                                            const slotData = schedule[dayIdx]?.[slotId];
                                            if (slotData) {
                                                for (const [classId, lesson] of Object.entries(slotData)) {
                                                    // IMPORTANTE: Comparar IDs corretamente
                                                    if (lesson && lesson.teacherId === selectedTeacher) {
                                                        aulasNoSlot.push({
                                                            classId,
                                                            subject: lesson.subject
                                                        });
                                                    }
                                                }
                                            }

                                            // Se não tem aula
                                            if (aulasNoSlot.length === 0) {
                                                return (
                                                    <td key={dayIdx} className="bg-green-50 dark:bg-green-900/20 p-2 text-center border border-slate-200 dark:border-gray-600">
                                                        <span className="text-green-400 dark:text-green-500 text-xs">LIVRE</span>
                                                    </td>
                                                );
                                            }

                                            // Conflito: mais de 1 aula no mesmo horário
                                            const hasConflict = aulasNoSlot.length > 1;

                                            return (
                                                <td
                                                    key={dayIdx}
                                                    className={`p-2 text-center border border-slate-200 dark:border-gray-600 ${hasConflict ? 'bg-red-100 dark:bg-red-900/20' : ''}`}
                                                    style={{ backgroundColor: hasConflict ? undefined : teacher.color }}
                                                >
                                                    {hasConflict && (
                                                        <div className="text-red-600 dark:text-red-400 text-xs font-bold mb-1">
                                                            CONFLITO!
                                                        </div>
                                                    )}
                                                    {aulasNoSlot.map((aula, i) => (
                                                        <div key={i} className={`${hasConflict ? 'text-red-700 dark:text-red-400' : 'text-slate-800'}`}>
                                                            <span className="font-bold">{aula.classId}</span>
                                                            <span className="text-xs ml-1 opacity-70">
                                                                {SUBJECT_ABBREVIATIONS[aula.subject] || aula.subject.slice(0, 3)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // ==========================================
    // VISÃO GERAL - GRID MAIOR
    // ==========================================
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {ALL_CLASSES.map(classId => (
                <MiniCard
                    key={classId}
                    classId={classId}
                    schedule={schedule}
                    teachers={teachers}
                />
            ))}
        </div>
    );
}

// ==========================================
// MINI CARD MELHORADO - MAIOR E MAIS CLARO
// ==========================================
function MiniCard({ classId, schedule, teachers }: { classId: string; schedule: any; teachers: any[] }) {
    const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

    const getColor = (teacherId: string) => teachers.find(t => t.id === teacherId)?.color || '#f3f4f6';
    const getAbbr = (subject: string) => {
        const abbr = SUBJECT_ABBREVIATIONS[subject];
        if (abbr) return abbr.slice(0, 3);
        return subject.slice(0, 3).toUpperCase();
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-gray-700 hover:shadow-xl transition-all">
            {/* Header da Turma */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white text-center py-3">
                <span className="text-xl font-bold">{classId}</span>
            </div>

            {/* Tabela */}
            <div className="p-2">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className="p-1 text-xs text-slate-400 dark:text-gray-500 w-6"></th>
                            {DIAS.map((d, i) => (
                                <th
                                    key={i}
                                    className={`p-1 text-xs text-center font-medium ${i === 4 ? 'text-orange-500 dark:text-orange-400' : 'text-slate-500 dark:text-gray-400'
                                        }`}
                                >
                                    {d}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[0, 1, 2, 3, 4, 5, 6].map(slotId => (
                            <tr key={slotId}>
                                <td className="p-1 text-xs text-center text-slate-400 dark:text-gray-500 font-bold">
                                    {slotId + 1}
                                </td>
                                {[0, 1, 2, 3, 4].map(dayIdx => {
                                    // Sexta sem 7ª aula
                                    if (dayIdx === 4 && slotId >= 6) {
                                        return (
                                            <td key={dayIdx} className="p-1">
                                                <div className="w-full h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-gray-300 dark:text-gray-600 text-xs">
                                                    —
                                                </div>
                                            </td>
                                        );
                                    }

                                    const lesson = schedule[dayIdx]?.[slotId]?.[classId];

                                    if (!lesson) {
                                        return (
                                            <td key={dayIdx} className="p-1">
                                                <div className="w-full h-8 bg-gray-50 dark:bg-gray-700 rounded"></div>
                                            </td>
                                        );
                                    }

                                    const bgColor = getColor(lesson.teacherId);

                                    return (
                                        <td key={dayIdx} className="p-1">
                                            <div
                                                className="w-full h-8 rounded flex items-center justify-center text-xs font-bold shadow-sm"
                                                style={{ backgroundColor: bgColor }}
                                                title={`${lesson.subject} - ${teachers.find(t => t.id === lesson.teacherId)?.name || '?'}`}
                                            >
                                                <span className="text-slate-700">{getAbbr(lesson.subject)}</span>
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
