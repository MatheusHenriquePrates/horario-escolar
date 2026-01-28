import { useState, useEffect, useMemo } from 'react';
import { useScheduleStore } from '../hooks/useScheduleStore';
import { useNotificationStore } from '../hooks/useNotificationStore';
import { NewScheduleGrid } from '../components/schedule/NewScheduleGrid';
import { FullScheduleGrid } from '../components/schedule/FullScheduleGrid';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { pdfAPI } from '../services/api';
import { ALL_CLASSES, WEEKDAYS, LESSONS_PER_DAY } from '../types';
import {
    FileDown,
    Loader2,
    AlertTriangle,
    CheckCircle,
    Eye,
    Users,
    User,
    Grid3X3,
    Coffee,
    UtensilsCrossed,
    Calendar,
    Palette,
    Table
} from 'lucide-react';

type ViewMode = 'all' | 'class' | 'teacher' | 'full';

export function SchedulePage() {
    const { teachers, schedule, fetchSchedule, generatedDate } = useScheduleStore();
    const { addNotification } = useNotificationStore();

    const [viewMode, setViewMode] = useState<ViewMode>('class');
    const [selectedClass, setSelectedClass] = useState<string>('6A');
    const [selectedTeacher, setSelectedTeacher] = useState<string>('');
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        fetchSchedule().catch(console.error);
    }, [fetchSchedule]);

    useEffect(() => {
        if (teachers.length > 0 && !selectedTeacher) {
            setSelectedTeacher(teachers[0].id);
        }
    }, [teachers]);

    // ==========================================
    // VALIDAÇÃO DE CONFLITOS E REGRAS
    // ==========================================
    const validationResults = useMemo(() => {
        const conflicts: string[] = [];
        const warnings: string[] = [];

        // 1. Verificar professor em 2 lugares ao mesmo tempo
        for (let day = 0; day < 5; day++) {
            const maxSlots = LESSONS_PER_DAY[day];
            for (let slot = 0; slot < maxSlots; slot++) {
                const teacherLocations = new Map<string, string[]>();

                if (schedule[day]?.[slot]) {
                    for (const [classId, lesson] of Object.entries(schedule[day][slot])) {
                        if (!teacherLocations.has(lesson.teacherId)) {
                            teacherLocations.set(lesson.teacherId, []);
                        }
                        teacherLocations.get(lesson.teacherId)!.push(classId);
                    }
                }

                for (const [teacherId, classes] of teacherLocations.entries()) {
                    if (classes.length > 1) {
                        const teacher = teachers.find(t => t.id === teacherId);
                        const dayName = WEEKDAYS[day];
                        conflicts.push(
                            `⚠️ ${teacher?.name || 'Professor'} em ${classes.length} turmas ao mesmo tempo: ${classes.join(', ')} (${dayName}, ${slot + 1}ª aula)`
                        );
                    }
                }
            }
        }

        // 2. Verificar mais de 2 aulas seguidas da mesma matéria por turma
        for (const classId of ALL_CLASSES) {
            for (let day = 0; day < 5; day++) {
                let consecutiveCount = 1;
                let lastSubject = '';

                const maxSlots = LESSONS_PER_DAY[day];
                for (let slot = 0; slot < maxSlots; slot++) {
                    const lesson = schedule[day]?.[slot]?.[classId];
                    const currentSubject = lesson?.subject || '';

                    if (currentSubject && currentSubject === lastSubject) {
                        consecutiveCount++;
                        if (consecutiveCount > 2) {
                            const dayName = WEEKDAYS[day];
                            warnings.push(
                                `📚 Turma ${classId}: ${currentSubject} tem ${consecutiveCount} aulas seguidas (${dayName}) - máximo recomendado: 2`
                            );
                        }
                    } else {
                        consecutiveCount = 1;
                    }
                    lastSubject = currentSubject;
                }
            }
        }

        return { conflicts, warnings };
    }, [schedule, teachers]);

    const handleExportPDF = async () => {
        setIsExporting(true);
        try {
            await pdfAPI.download();
            addNotification('success', 'PDF exportado!');
        } catch (error) {
            addNotification('error', error instanceof Error ? error.message : 'Erro ao exportar');
        } finally {
            setIsExporting(false);
        }
    };

    const hasSchedule = Object.keys(schedule).length > 0;
    const hasProblems = validationResults.conflicts.length > 0 || validationResults.warnings.length > 0;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        Grade de Horários
                    </h1>
                    {generatedDate && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Gerada em: {new Date(generatedDate).toLocaleString('pt-BR')}
                        </p>
                    )}
                </div>

                <Button
                    onClick={handleExportPDF}
                    disabled={isExporting || !hasSchedule}
                    className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700"
                >
                    {isExporting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
                    ) : (
                        <><FileDown className="w-4 h-4 mr-2" />Exportar PDF</>
                    )}
                </Button>
            </div>

            {/* Alertas de Conflitos */}
            {validationResults.conflicts.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-800 p-4 rounded-r-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-red-700 dark:text-red-300">
                                🚨 {validationResults.conflicts.length} CONFLITO(S) ENCONTRADO(S)!
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-red-600 dark:text-red-400">
                                {validationResults.conflicts.map((c, i) => (
                                    <li key={i}>{c}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Avisos de Aulas Consecutivas */}
            {validationResults.warnings.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 dark:border-amber-800 p-4 rounded-r-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-amber-700 dark:text-amber-300">
                                ⚠️ {validationResults.warnings.length} AVISO(S) - Aulas Consecutivas
                            </p>
                            <ul className="mt-2 space-y-1 text-sm text-amber-600 dark:text-amber-400 max-h-40 overflow-y-auto">
                                {validationResults.warnings.map((w, i) => (
                                    <li key={i}>{w}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Status OK */}
            {hasSchedule && !hasProblems && (
                <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-800 p-4 rounded-r-lg flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 dark:text-green-400" />
                    <span className="font-medium text-green-700 dark:text-green-300">✅ Grade válida! Sem conflitos ou problemas.</span>
                </div>
            )}

            {/* Filtros de Visualização */}
            <Card>
                <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Visualizar:
                    </span>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('class')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'class'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            <Users className="w-4 h-4" />
                            Por Turma
                        </button>
                        <button
                            onClick={() => setViewMode('teacher')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'teacher'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            <User className="w-4 h-4" />
                            Por Professor
                        </button>
                        <button
                            onClick={() => setViewMode('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'all'
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            <Grid3X3 className="w-4 h-4" />
                            Todas
                        </button>
                        <button
                            onClick={() => setViewMode('full')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${viewMode === 'full'
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            <Table className="w-4 h-4" />
                            Grade Completa
                        </button>
                    </div>

                    {viewMode === 'class' && (
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            {ALL_CLASSES.map(c => (
                                <option key={c} value={c}>Turma {c}</option>
                            ))}
                        </select>
                    )}

                    {viewMode === 'teacher' && (
                        <select
                            value={selectedTeacher}
                            onChange={(e) => setSelectedTeacher(e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    )}
                </div>
            </Card>

            {/* Legenda */}
            {hasSchedule && (
                <Card title={
                    <span className="flex items-center gap-2">
                        <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Legenda de Professores
                    </span>
                }>
                    <div className="flex flex-wrap gap-2">
                        {teachers.map(t => (
                            <div
                                key={t.id}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg shadow-sm border"
                                style={{
                                    backgroundColor: t.color,
                                    borderColor: t.color
                                }}
                            >
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                                >
                                    {t.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 opacity-90">{t.name}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Grade */}
            {!hasSchedule ? (
                <Card>
                    <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                        <div className="text-6xl mb-4">📋</div>
                        <p className="text-xl font-medium text-gray-700 dark:text-gray-300">Nenhuma grade gerada ainda</p>
                        <p className="text-sm mt-2">
                            Vá para <strong>"Cadastro"</strong>, adicione professores e clique em <strong>"Gerar Horários"</strong>
                        </p>
                    </div>
                </Card>
            ) : (
                <>
                    {viewMode === 'full' ? (
                        <FullScheduleGrid />
                    ) : (
                        <NewScheduleGrid
                            viewMode={viewMode}
                            selectedClass={selectedClass}
                            selectedTeacher={selectedTeacher}
                        />
                    )}
                </>
            )}
        </div>
    );
}
