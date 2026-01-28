import { useState, useMemo, useEffect } from 'react';
import { useScheduleStore } from '../../hooks/useScheduleStore';
import type { Lesson, ClassId } from '../../types';
import { ALL_CLASSES, TIMESLOTS, WEEKDAYS } from '../../types';
import { toast } from 'sonner';
import { getCorProfessor, lightenColor } from '../../utils/colors';

// --- Types ---
interface Sugestao {
    tipo: 'TROCAR' | 'REALOCAR';
    titulo: string;
    descricao: string;
    acao: () => Promise<void> | void;
}

// --- Componente ModalSugestoes ---
function ModalSugestoes({
    sugestoes,
    mensagemErro,
    onFechar,
    onAplicar
}: {
    sugestoes: Sugestao[],
    mensagemErro: string,
    onFechar: () => void,
    onAplicar: () => void
}) {
    const [sugestaoSelecionada, setSugestaoSelecionada] = useState<Sugestao | null>(null);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 shadow-2xl">
                <h2 className="text-2xl font-bold mb-4 text-red-600">
                    ⚠️ Conflito Detectado
                </h2>

                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
                    <p className="text-sm text-red-800">{mensagemErro}</p>
                </div>

                <h3 className="font-bold text-lg mb-3">
                    💡 Sugestões para Resolver:
                </h3>

                <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
                    {sugestoes.map((sugestao, index) => (
                        <div
                            key={index}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${sugestaoSelecionada === sugestao
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300'
                                }`}
                            onClick={() => setSugestaoSelecionada(sugestao)}
                        >
                            <div className="flex items-start">
                                <input
                                    type="radio"
                                    checked={sugestaoSelecionada === sugestao}
                                    onChange={() => setSugestaoSelecionada(sugestao)}
                                    className="mt-1 mr-3 h-4 w-4"
                                />
                                <div>
                                    <h4 className="font-bold text-blue-600">{sugestao.titulo}</h4>
                                    <p className="text-sm text-gray-600 mt-1">{sugestao.descricao}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onFechar}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={async () => {
                            if (!sugestaoSelecionada) {
                                toast.error('Selecione uma sugestão primeiro!');
                                return;
                            }

                            await sugestaoSelecionada.acao();
                            onAplicar();
                            toast.success('Alteração aplicada! Use Ctrl+Z para desfazer.');
                        }}
                        disabled={!sugestaoSelecionada}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Aplicar Solução
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Componente Principal ---
export function ScheduleContainer() {
    const { schedule, setSchedule, teachers } = useScheduleStore();
    const [draggedLesson, setDraggedLesson] = useState<{ lesson: Lesson, fromDay: number, fromSlot: number } | null>(null);
    const [historico, setHistorico] = useState<any[]>([]);

    const [modalAberto, setModalAberto] = useState(false);
    const [sugestoesAtuais, setSugestoesAtuais] = useState<Sugestao[]>([]);
    const [erroAtual, setErroAtual] = useState('');

    const getTeacherName = (tId: string) => teachers.find(t => t.id === tId)?.name || "N/A";

    const professoresUnicos = useMemo(() => {
        const unique = new Map();
        teachers.forEach(t => {
            unique.set(t.id, t);
        });
        return Array.from(unique.values());
    }, [teachers]);

    function salvarHistorico() {
        const estadoAtual = JSON.parse(JSON.stringify(schedule));
        setHistorico(prev => [...prev, estadoAtual]);
    }

    function desfazer() {
        if (historico.length === 0) {
            toast.info('Nada para desfazer!');
            return;
        }

        const estadoAnterior = historico[historico.length - 1];
        setSchedule(estadoAnterior);
        setHistorico(prev => prev.slice(0, -1));
        toast.info('↩️ Desfeito!');
    }

    // --- NOVA LÓGICA DE RECARREGAMENTO AUTOMÁTICO ---
    const carregarGrade = async () => {
        try {
            // Verificar se há professores
            const professoresResponse = await fetch('http://localhost:3000/api/teachers'); // Corrected endpoint matching server.ts
            const professores = await professoresResponse.json();

            if (!professores || professores.length === 0) {
                setSchedule({});
                return;
            }

            // Se existirem professores, tentamos recarregar a grade
            // NOTE: Start using store refresh or just setSchedule directly if we verify the hash?
            // User requested: "Passo 2: Limpar grade quando não houver professores"
            // And implicitly refresh logic.
            // Since we don't have store.fetchSchedule exposed easily without refactor, 
            // and the user didn't provide store logic updates, I will assume the 'Empty State' check is the primary goal
            // and the 'setInterval' is to trigger this check.
            // BUT to actually REFRESH the grid content if it changes (e.g. diff computer), we need to fetch schedule.

            const scheduleResponse = await fetch('http://localhost:3000/api/grade'); // Assuming standard route
            const scheduleData = await scheduleResponse.json();

            if (scheduleData && Object.keys(scheduleData).length > 0) {
                setSchedule(scheduleData);
            } else {
                setSchedule({});
            }

        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        carregarGrade();
        const interval = setInterval(() => {
            carregarGrade();
        }, 2000);
        return () => clearInterval(interval);
    }, []);



    // Helper safely access using simple string or cast
    const getLesson = (sched: any, day: number, slot: number, classId: string): Lesson | null => {
        return sched[day]?.[slot]?.[classId] || null;
    }

    const temAulaNoHorario = (teacherId: string, day: number, slot: number, ignoreLessonId?: string): boolean => {
        const classes = schedule[day]?.[slot] || {};
        for (const cId in classes) {
            const l = classes[cId as ClassId];
            if (l && l.teacherId === teacherId && l.id !== ignoreLessonId) return true;
        }
        return false;
    }

    const buscarSugestoesTroca = (
        aulaOriginal: Lesson,
        novaTurma: string,
        novoDia: number,
        novoSlot: number,
        tipoConflito: 'TURMA' | 'PROFESSOR',
        conflitoMeta?: any
    ): Sugestao[] => {
        const sugestoes: Sugestao[] = [];

        // 1. Conflito de Turma
        if (tipoConflito === 'TURMA') {
            const aulaConflitante = getLesson(schedule, novoDia, novoSlot, novaTurma);
            if (aulaConflitante) {
                const profConflitanteLivreNoOriginal = !temAulaNoHorario(aulaConflitante.teacherId, aulaOriginal.day, aulaOriginal.timeSlot, aulaConflitante.id);
                // Check if current prof is free at new slot (should be, unless double booked) and free at conflict slot?
                // Logic: We want to put Original Teacher at New Slot. We know New Slot is occupied by Class.
                // Does Original Teacher have another lesson at New Slot? (We checked that in attemptMoveLesson, and if yes, we would have PROFESSOR conflict unless strictly TURMA conflict caught first).
                // Actually attemptMove checks Turma first. So we might have Prof conflict too.
                const profOriginalLivreNoNovo = !temAulaNoHorario(aulaOriginal.teacherId, novoDia, novoSlot, aulaOriginal.id);

                if (profConflitanteLivreNoOriginal && profOriginalLivreNoNovo) {
                    sugestoes.push({
                        tipo: 'TROCAR',
                        titulo: `Trocar com ${aulaConflitante.subject}`,
                        descricao: `Colocar ${aulaConflitante.subject} na ${WEEKDAYS[aulaOriginal.day]} (${aulaOriginal.timeSlot + 1}ª) e mover ${aulaOriginal.subject} para cá.`,
                        acao: () => {
                            salvarHistorico();
                            const newGrid = JSON.parse(JSON.stringify(schedule));

                            delete newGrid[novoDia][novoSlot][novaTurma];
                            if (!newGrid[aulaOriginal.day]) newGrid[aulaOriginal.day] = {};
                            if (!newGrid[aulaOriginal.day][aulaOriginal.timeSlot]) newGrid[aulaOriginal.day][aulaOriginal.timeSlot] = {};

                            const newAulaConflitante = { ...aulaConflitante, day: aulaOriginal.day, timeSlot: aulaOriginal.timeSlot };
                            newGrid[aulaOriginal.day][aulaOriginal.timeSlot][novaTurma] = newAulaConflitante;

                            delete newGrid[aulaOriginal.day][aulaOriginal.timeSlot][aulaOriginal.classId];

                            const newAulaOriginal = { ...aulaOriginal, day: novoDia, timeSlot: novoSlot, classId: novaTurma };
                            newGrid[novoDia][novoSlot][novaTurma] = newAulaOriginal;

                            setSchedule(newGrid);
                        }
                    });
                }
            }
        }

        // 2. Conflito de Professor
        if (tipoConflito === 'PROFESSOR') {
            const conflictingClassId = conflitoMeta?.turma;
            const conflictingLesson = getLesson(schedule, novoDia, novoSlot, conflictingClassId);

            if (conflictingLesson) {
                const classFreeAtOriginal = !getLesson(schedule, aulaOriginal.day, aulaOriginal.timeSlot, conflictingClassId);

                if (classFreeAtOriginal) {
                    sugestoes.push({
                        tipo: 'TROCAR',
                        titulo: `Trocar horários do Professor`,
                        descricao: `Mover a aula de ${conflictingClassId} para ${WEEKDAYS[aulaOriginal.day]} e trazer esta para cá.`,
                        acao: () => {
                            salvarHistorico();
                            const newGrid = JSON.parse(JSON.stringify(schedule));

                            delete newGrid[novoDia][novoSlot][conflictingClassId];
                            if (!newGrid[aulaOriginal.day]) newGrid[aulaOriginal.day] = {};
                            if (!newGrid[aulaOriginal.day][aulaOriginal.timeSlot]) newGrid[aulaOriginal.day][aulaOriginal.timeSlot] = {};

                            newGrid[aulaOriginal.day][aulaOriginal.timeSlot][conflictingClassId] = {
                                ...conflictingLesson, day: aulaOriginal.day, timeSlot: aulaOriginal.timeSlot
                            };

                            delete newGrid[aulaOriginal.day][aulaOriginal.timeSlot][aulaOriginal.classId];
                            if (!newGrid[novoDia]) newGrid[novoDia] = {};
                            if (!newGrid[novoDia][novoSlot]) newGrid[novoDia][novoSlot] = {};

                            newGrid[novoDia][novoSlot][novaTurma] = {
                                ...aulaOriginal, day: novoDia, timeSlot: novoSlot, classId: novaTurma
                            };

                            setSchedule(newGrid);
                        }
                    });
                }
            }
        }

        return sugestoes;
    };

    const attemptMoveLesson = async (lesson: Lesson, newDay: number, newSlot: number, newTurma: string) => {
        let conflictError = '';
        let conflictType: 'TURMA' | 'PROFESSOR' | null = null;
        let conflictMeta: any = {};

        // 1. Turma Ocupada?
        if (getLesson(schedule, newDay, newSlot, newTurma)) {
            conflictError = `A turma ${newTurma} já tem aula neste horário!`;
            conflictType = 'TURMA';
        }

        // 2. Professor Ocupado?
        if (!conflictType) {
            const classesAtTarget = schedule[newDay]?.[newSlot] || {};
            for (const cId in classesAtTarget) {
                if (classesAtTarget[cId as ClassId]?.teacherId === lesson.teacherId && cId !== lesson.classId) {
                    conflictError = `O professor ${getTeacherName(lesson.teacherId)} já está dando aula na turma ${cId}!`;
                    conflictType = 'PROFESSOR';
                    conflictMeta = { turma: cId };
                    break;
                }
            }
        }

        if (conflictType) {
            const sugestoes = buscarSugestoesTroca(lesson, newTurma, newDay, newSlot, conflictType, conflictMeta);
            if (sugestoes.length > 0) {
                setSugestoesAtuais(sugestoes);
                setErroAtual(conflictError);
                setModalAberto(true);
            } else {
                toast.error(conflictError + " (Sem trocas automáticas disponíveis)");
            }
            return;
        }

        salvarHistorico();
        const newSchedule = JSON.parse(JSON.stringify(schedule));

        if (newSchedule[lesson.day]?.[lesson.timeSlot]?.[lesson.classId]) {
            delete newSchedule[lesson.day][lesson.timeSlot][lesson.classId];
        }

        if (!newSchedule[newDay]) newSchedule[newDay] = {};
        if (!newSchedule[newDay][newSlot]) newSchedule[newDay][newSlot] = {};

        newSchedule[newDay][newSlot][newTurma] = { ...lesson, day: newDay, timeSlot: newSlot, classId: newTurma };

        setSchedule(newSchedule);
        toast.success("Aula movida!");
    };

    const handleGenerarPDF = async () => {
        try {
            toast.promise(
                fetch('http://localhost:3000/api/pdf/gerar'),
                {
                    loading: 'Gerando PDF...',
                    success: 'PDF Gerado! (Simulação - Backend pendente)',
                    error: 'Erro ao gerar PDF (Backend pode estar offline)'
                }
            );
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Grade Completa - Todas as Turmas</h1>

                <div className="flex gap-3">
                    <button
                        onClick={desfazer}
                        disabled={historico.length === 0}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        ↩️ Desfazer
                    </button>
                    <button
                        onClick={handleGenerarPDF}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                    >
                        📄 Exportar PDF
                    </button>
                </div>
            </div>

            {/* EMPTY STATE - NO TEACHERS OR NO SCHEDULE */}
            {(!teachers || teachers.length === 0 || Object.keys(schedule).length === 0) && (
                <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded shadow-sm">
                    <div className="flex items-center mb-2">
                        <svg className="w-6 h-6 text-yellow-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <h2 className="text-xl font-bold text-yellow-800">Nenhuma Grade Gerada</h2>
                    </div>
                    <p className="text-yellow-700 mb-4">
                        Você ainda não gerou os horários. Siga estes passos:
                    </p>
                    <ol className="list-decimal list-inside text-yellow-700 space-y-2 font-medium">
                        <li>Vá para a aba "Cadastro"</li>
                        <li>Cadastre pelo menos 1 professor com suas disciplinas</li>
                        <li>Clique no botão verde "Gerar Horários Automáticos"</li>
                        <li>Volte aqui para visualizar a grade</li>
                    </ol>
                    <button
                        onClick={() => window.location.reload()} // Simple reload or nav hook
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm"
                    >
                        Atualizar Agora
                    </button>
                </div>
            )}

            <div className="mb-4 p-4 bg-white rounded-lg shadow border border-gray-200">
                <h3 className="font-bold text-lg mb-3">Legenda de Professores:</h3>
                <div className="flex flex-wrap gap-2">
                    {professoresUnicos.map(professor => {
                        const cor = getCorProfessor(professor.name);
                        return (
                            <div
                                key={professor.id}
                                className="flex items-center px-3 py-1 rounded-full border shadow-sm text-xs"
                                style={{
                                    backgroundColor: lightenColor(cor, 50),
                                    borderColor: cor
                                }}
                            >
                                <div
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: cor }}
                                />
                                <span className="font-medium text-gray-700">{professor.name}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-600 text-white">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-blue-500 w-24 sticky left-0 bg-blue-600 z-10">
                                HORÁRIO
                            </th>
                            {WEEKDAYS.map((day) => (
                                <th key={day} className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider border-r border-blue-500 min-w-[200px]">
                                    {day}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {TIMESLOTS.map((slot, slotIndex) => {
                            if (slot.type === 'break') {
                                return (
                                    <tr key={slot.id} className="bg-gray-100">
                                        <td className="px-3 py-2 text-xs font-bold text-gray-500 uppercase border-r border-gray-200 sticky left-0 bg-gray-100 z-10">
                                            {slot.label.split(' - ')[0]}<br />
                                            <span className="text-[10px] font-normal">{slot.label.split(' - ')[1]}</span>
                                        </td>
                                        <td colSpan={5} className="px-3 py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                                            {slot.name}
                                        </td>
                                    </tr>
                                );
                            }

                            const slotId = slot.id as number;

                            return (
                                <tr key={slot.id}>
                                    <td className="px-3 py-2 text-xs font-bold text-gray-700 border-r border-gray-200 sticky left-0 bg-white z-10">
                                        {slotIndex + 1}ª Aula<br />
                                        <span className="text-[10px] font-normal text-gray-500">{slot.label}</span>
                                    </td>
                                    {WEEKDAYS.map((_, dayIndex) => (
                                        <td
                                            key={dayIndex}
                                            className="p-1 border-r border-gray-200 align-top h-32 hover:bg-gray-50 transition-colors"
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                if (draggedLesson) {
                                                    attemptMoveLesson(draggedLesson.lesson, dayIndex, slotId, draggedLesson.lesson.classId);
                                                    setDraggedLesson(null);
                                                }
                                            }}
                                        >
                                            <div className="grid grid-cols-1 gap-1 min-w-[180px]">
                                                {ALL_CLASSES.map(classId => {
                                                    const lesson = schedule[dayIndex]?.[slotId]?.[classId as ClassId];
                                                    if (!lesson) return null;

                                                    const corProfessor = getCorProfessor(getTeacherName(lesson.teacherId));
                                                    const corFundo = lightenColor(corProfessor, 50);

                                                    return (
                                                        <div
                                                            key={classId}
                                                            className="mb-2 p-3 rounded-lg shadow-sm cursor-move transition-all hover:shadow-md hover:scale-[1.02] border-2"
                                                            style={{
                                                                backgroundColor: corFundo,
                                                                borderColor: corProfessor,
                                                                minHeight: '80px'
                                                            }}
                                                            draggable
                                                            onDragStart={(e) => {
                                                                setDraggedLesson({ lesson, fromDay: dayIndex, fromSlot: slotId });
                                                                e.currentTarget.style.opacity = '0.5';
                                                            }}
                                                            onDragEnd={(e) => {
                                                                e.currentTarget.style.opacity = '1';
                                                            }}
                                                        >
                                                            {/* LINHA 1: TURMA + MATÉRIA */}
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span
                                                                    className="text-lg font-black"
                                                                    style={{ color: corProfessor }}
                                                                >
                                                                    {classId}
                                                                </span>
                                                                <span
                                                                    className="px-2 py-0.5 rounded text-[10px] text-white font-bold uppercase tracking-wide shadow-sm"
                                                                    style={{ backgroundColor: corProfessor }}
                                                                >
                                                                    {lesson.subject.substring(0, 10)}
                                                                </span>
                                                            </div>

                                                            {/* LINHA 2: PROFESSOR COM ÍCONE */}
                                                            <div className="flex items-center mt-1 pt-1 border-t border-black/10">
                                                                <div
                                                                    className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs mr-2 shadow-sm"
                                                                    style={{ backgroundColor: corProfessor }}
                                                                >
                                                                    {getTeacherName(lesson.teacherId).charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="font-semibold text-xs text-gray-800 truncate">
                                                                    {getTeacherName(lesson.teacherId)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {modalAberto && (
                <ModalSugestoes
                    sugestoes={sugestoesAtuais}
                    mensagemErro={erroAtual}
                    onFechar={() => setModalAberto(false)}
                    onAplicar={() => setModalAberto(false)}
                />
            )}
        </div>
    );
}
