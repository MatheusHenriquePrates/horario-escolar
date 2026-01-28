import { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useScheduleStore } from '../../hooks/useScheduleStore';
import { useNotificationStore } from '../../hooks/useNotificationStore';
import { pdfAPI, teacherAPI } from '../../services/api';
import { validateSchedule, type ValidationResult } from '../../services/validationAPI';
import { EditTeacherModal } from './EditTeacherModal';
import { Trash2, Edit, Play, Loader2, FileDown, CheckCircle } from 'lucide-react';
import type { Teacher } from '../../types';

const AVATAR_COLORS = [
    'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400',
    'bg-teal-400', 'bg-blue-400', 'bg-indigo-400', 'bg-purple-400', 'bg-pink-400',
];

const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export function TeacherList() {
    const { teachers, removeTeacherFromBackend, generateSchedule, fetchTeachers } = useScheduleStore();
    const { addNotification } = useNotificationStore();

    const [isGenerating, setIsGenerating] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [showValidation, setShowValidation] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());

    const calcWeeklyLessons = (allocations: { lessonsPerWeek: number; classes: string[] }[]) => {
        return allocations.reduce((acc, a) => acc + (a.lessonsPerWeek * a.classes.length), 0);
    };

    const calcRealHours = (weeklyLessons: number) => {
        return Math.round((weeklyLessons * 50 / 60) * 4);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Deseja realmente excluir o professor "${name}"?`)) return;

        setDeletingId(id);
        try {
            await removeTeacherFromBackend(id);
            addNotification('success', `Professor "${name}" removido com sucesso.`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            addNotification('error', `Erro ao deletar: ${message}`);
        } finally {
            setDeletingId(null);
        }
    };

    const handleGenerateSchedule = async () => {
        if (teachers.length === 0) {
            addNotification('error', 'Cadastre pelo menos um professor primeiro.');
            return;
        }

        setIsGenerating(true);
        try {
            // Se houver professores selecionados, gerar apenas para eles
            const teacherIds = selectedTeachers.size > 0
                ? Array.from(selectedTeachers)
                : undefined;

            const result = await generateSchedule(teacherIds);

            if (result.success) {
                if (selectedTeachers.size > 0) {
                    addNotification('success', `Grade gerada para ${selectedTeachers.size} professor(es) selecionado(s)!`);
                } else {
                    addNotification('success', result.message);
                }
                result.warnings?.forEach(w => addNotification('warning', w));
                setSelectedTeachers(new Set()); // Limpar seleção após gerar
            } else {
                addNotification('error', result.message);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            addNotification('error', `Falha ao gerar horários: ${message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExportPDF = async () => {
        setIsExportingPDF(true);
        try {
            await pdfAPI.download();
            addNotification('success', 'PDF exportado com sucesso! Verifique seus downloads.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao gerar PDF';
            addNotification('error', message);
        } finally {
            setIsExportingPDF(false);
        }
    };

    const handleValidate = async () => {
        setIsValidating(true);
        try {
            const result = await validateSchedule();
            setValidationResult(result);
            setShowValidation(true);

            if (result.valid) {
                addNotification('success', '✅ Grade válida! Sem conflitos críticos.');
            } else {
                addNotification('error', `❌ ${result.conflicts.length} conflitos encontrados!`);
            }

            if (result.warnings.length > 0) {
                addNotification('warning', `⚠️  ${result.warnings.length} avisos detectados.`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao validar grade';
            addNotification('error', message);
        } finally {
            setIsValidating(false);
        }
    };

    const handleEditTeacher = async (teacherId: string, updates: Partial<Teacher>) => {
        try {
            // Buscar professor completo para manter as disciplinas
            const teacher = teachers.find(t => t.id === teacherId);
            if (!teacher) throw new Error('Professor não encontrado');

            // Montar payload com dados atualizados
            const payload = {
                nome: updates.name || teacher.name,
                cargaHoraria: updates.workloadMonthly || teacher.workloadMonthly,
                color: teacher.color,
                disciplinas: teacher.allocations.map(a => ({
                    nome: a.subject,
                    aulasPorSemana: a.lessonsPerWeek,
                    turmas: a.classes
                }))
            };

            await teacherAPI.update(teacherId, payload);
            await fetchTeachers();
            addNotification('success', 'Professor atualizado com sucesso!');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao atualizar professor';
            addNotification('error', message);
            throw error;
        }
    };

    const summarizeSubjects = (allocations: { subject: string; classes: string[] }[]) => {
        return allocations.map(a => ({ subject: a.subject, count: a.classes.length }));
    };

    const handleSelectAll = () => {
        if (selectedTeachers.size === teachers.length) {
            setSelectedTeachers(new Set());
        } else {
            setSelectedTeachers(new Set(teachers.map(t => t.id)));
        }
    };

    const handleSelectTeacher = (teacherId: string) => {
        const newSelected = new Set(selectedTeachers);
        if (newSelected.has(teacherId)) {
            newSelected.delete(teacherId);
        } else {
            newSelected.add(teacherId);
        }
        setSelectedTeachers(newSelected);
    };

    const handleDeleteSelected = async () => {
        if (selectedTeachers.size === 0) return;

        const count = selectedTeachers.size;
        if (!confirm(`Deseja realmente excluir ${count} professor(es) selecionado(s)?`)) return;

        setDeletingId('batch'); // Indicador especial para deleção em lote

        try {
            const deletePromises = Array.from(selectedTeachers).map(id =>
                removeTeacherFromBackend(id)
            );

            await Promise.all(deletePromises);

            addNotification('success', `${count} professor(es) removido(s) com sucesso.`);
            setSelectedTeachers(new Set());
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido';
            addNotification('error', `Erro ao deletar professores: ${message}`);
        } finally {
            setDeletingId(null);
        }
    };

    if (teachers.length === 0) {
        return (
            <Card title="Professores Cadastrados (0)">
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>Nenhum professor cadastrado ainda.</p>
                    <p className="text-sm mt-2">Use o formulário acima para cadastrar.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card
            title={`Professores Cadastrados (${teachers.length})`}
            action={
                <div className="flex gap-2">
                    {selectedTeachers.size > 0 && (
                        <Button
                            onClick={handleDeleteSelected}
                            disabled={deletingId !== null}
                            variant="outline"
                            className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                            {deletingId === 'batch' ? (
                                <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Excluindo...</>
                            ) : (
                                <><Trash2 className="w-4 h-4 mr-1" />Excluir ({selectedTeachers.size})</>
                            )}
                        </Button>
                    )}
                    <Button
                        onClick={handleValidate}
                        disabled={isValidating || isGenerating}
                        variant="outline"
                        className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    >
                        {isValidating ? (
                            <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Validando...</>
                        ) : (
                            <><CheckCircle className="w-4 h-4 mr-1" />Validar Grade</>
                        )}
                    </Button>
                    <Button
                        onClick={handleExportPDF}
                        disabled={isExportingPDF || isGenerating}
                        variant="outline"
                        className="text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/30"
                    >
                        {isExportingPDF ? (
                            <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Gerando...</>
                        ) : (
                            <><FileDown className="w-4 h-4 mr-1" />Exportar PDF</>
                        )}
                    </Button>
                    <Button
                        onClick={handleGenerateSchedule}
                        disabled={isGenerating || isExportingPDF}
                        className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                    >
                        {isGenerating ? (
                            <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Gerando...</>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-1" />
                                Gerar Horários
                                {selectedTeachers.size > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                                        ({selectedTeachers.size})
                                    </span>
                                )}
                            </>
                        )}
                    </Button>
                </div>
            }
        >
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="w-12 py-3 px-4">
                                <input
                                    type="checkbox"
                                    checked={selectedTeachers.size === teachers.length}
                                    onChange={handleSelectAll}
                                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                    title="Selecionar todos"
                                />
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Professor</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Carga Mensal</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Aulas Semanais</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Resumo Disciplinas</th>
                            <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teachers.map((teacher, index) => {
                            const weeklyLessons = calcWeeklyLessons(teacher.allocations);
                            const realHours = calcRealHours(weeklyLessons);
                            const subjectSummary = summarizeSubjects(teacher.allocations);
                            const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
                            const isDeleting = deletingId === teacher.id;

                            return (
                                <tr key={teacher.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="py-4 px-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedTeachers.has(teacher.id)}
                                            onChange={() => handleSelectTeacher(teacher.id)}
                                            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                            title="Selecionar professor"
                                        />
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-sm`}
                                                style={{ backgroundColor: teacher.color || undefined }}
                                            >
                                                {getInitials(teacher.name)}
                                            </div>
                                            <span className="font-medium text-gray-900 dark:text-white">{teacher.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-gray-600 dark:text-gray-300">{teacher.workloadMonthly}h</td>
                                    <td className="py-4 px-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900 dark:text-white">{weeklyLessons} aulas</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">~{realHours}h reais</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex flex-wrap gap-1">
                                            {subjectSummary.map((s, i) => (
                                                <span key={i} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                    {s.subject} ({s.count} turmas)
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => setEditingTeacher(teacher)}
                                                className="p-2 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                                                title="Editar"
                                                disabled={isDeleting}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(teacher.id, teacher.name)}
                                                disabled={isDeleting}
                                                className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded disabled:opacity-50 transition-colors"
                                                title="Excluir"
                                            >
                                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Texto de Ajuda */}
            {selectedTeachers.size > 0 && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        ✓ {selectedTeachers.size} professor(es) selecionado(s).
                    </p>
                    <ul className="text-sm text-blue-600 dark:text-blue-400 mt-2 ml-4 list-disc">
                        <li>Clique em "Gerar Horários" para gerar a grade apenas para os selecionados</li>
                        <li>Clique em "Excluir ({selectedTeachers.size})" para remover todos os selecionados</li>
                    </ul>
                </div>
            )}

            {/* Modal de Edição */}
            {editingTeacher && (
                <EditTeacherModal
                    teacher={editingTeacher}
                    isOpen={true}
                    onClose={() => setEditingTeacher(null)}
                    onSave={handleEditTeacher}
                />
            )}

            {/* Modal de Validação */}
            {showValidation && validationResult && (
                <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                📋 Relatório de Validação da Grade
                            </h3>
                            <button
                                onClick={() => setShowValidation(false)}
                                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Status Geral */}
                            <div className={`p-4 rounded-lg ${validationResult.valid ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                                <div className={`text-lg font-bold ${validationResult.valid ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'}`}>
                                    {validationResult.valid ? '✅ GRADE VÁLIDA' : '❌ GRADE INVÁLIDA'}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {validationResult.valid ? 'Sem conflitos críticos detectados!' : `${validationResult.conflicts.length} conflitos críticos encontrados`}
                                </p>
                            </div>

                            {/* Conflitos */}
                            {validationResult.conflicts.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                    <h4 className="font-bold text-red-900 dark:text-red-300 mb-2">🚨 Conflitos Críticos:</h4>
                                    <ul className="space-y-2">
                                        {validationResult.conflicts.map((conflict, idx) => (
                                            <li key={idx} className="text-sm text-red-800 dark:text-red-300 flex items-start gap-2">
                                                <span className="font-bold">{idx + 1}.</span>
                                                <span>{conflict.description}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Avisos */}
                            {validationResult.warnings.length > 0 && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                    <h4 className="font-bold text-yellow-900 dark:text-yellow-300 mb-2">⚠️  Avisos ({validationResult.warnings.length}):</h4>
                                    <div className="max-h-64 overflow-y-auto">
                                        <ul className="space-y-1">
                                            {validationResult.warnings.slice(0, 10).map((warning, idx) => (
                                                <li key={idx} className="text-sm text-yellow-800 dark:text-yellow-300 flex items-start gap-2">
                                                    <span>•</span>
                                                    <span>{warning.description}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        {validationResult.warnings.length > 10 && (
                                            <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                                                ... e mais {validationResult.warnings.length - 10} avisos
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Estatísticas */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-3">📊 Estatísticas:</h4>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">Total de Aulas:</p>
                                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{validationResult.stats.totalLessons}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">Violações de Consecutivas:</p>
                                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{validationResult.stats.consecutiveViolations}</p>
                                    </div>
                                </div>

                                {/* Utilização de Professores */}
                                <div className="mb-4">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Utilização de Professores:</p>
                                    <div className="space-y-2">
                                        {validationResult.stats.teacherUtilization.map((util, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <span className="text-xs text-gray-600 dark:text-gray-300 w-32 truncate">{util.teacher}</span>
                                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 relative">
                                                    <div
                                                        className={`h-4 rounded-full ${util.percentage >= 80 ? 'bg-green-500' : util.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                        style={{ width: `${util.percentage}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs text-gray-600 dark:text-gray-300 w-20">{util.used}/{util.capacity} ({util.percentage}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Cobertura de Disciplinas */}
                                <div>
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cobertura de Disciplinas:</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {validationResult.stats.subjectCoverage.map((cov, idx) => (
                                            <div key={idx} className="flex justify-between">
                                                <span className={cov.percentage === 100 ? 'text-green-600 dark:text-green-400' : cov.percentage >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}>
                                                    {cov.percentage === 100 ? '✅' : cov.percentage >= 50 ? '⚠️' : '❌'} {cov.subject}
                                                </span>
                                                <span className="text-gray-600 dark:text-gray-400">{cov.covered}/{cov.total} ({cov.percentage}%)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 border-t dark:border-gray-600 p-4 flex justify-end">
                            <Button onClick={() => setShowValidation(false)}>
                                Fechar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
