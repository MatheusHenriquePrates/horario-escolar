import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useScheduleStore } from '../../hooks/useScheduleStore';
import { useNotificationStore } from '../../hooks/useNotificationStore';
import type { SubjectName } from '../../types';
import { TeacherList } from './TeacherList';
import { SubjectCheckboxList } from './SubjectCheckboxList';
import { ClassesFilter } from './ClassesFilter';
import { IntelligentDashboard } from './IntelligentDashboard';
import { distributeAutomatically, getOccupiedClasses, SCHOOL_CONFIG } from '../../utils/autoDistributor';
import { Save, Loader2, Info, Filter } from 'lucide-react';

const generateRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 80%)`;
};

export function RegistrationContainer() {
    const { teachers, addTeacherToBackend, fetchTeachers } = useScheduleStore();
    const { addNotification } = useNotificationStore();

    const [name, setName] = useState('');
    const [workload, setWorkload] = useState<number>(165);
    const [selectedSubjects, setSelectedSubjects] = useState<SubjectName[]>([]);
    const [allowedClasses, setAllowedClasses] = useState<string[]>([]); // Turmas permitidas para este professor
    const [isSaving, setIsSaving] = useState(false);
    const [preview, setPreview] = useState<{
        capacidade: number;
        aulasEstimadas: number;
        turmasEstimadas: number;
    } | null>(null);

    useEffect(() => {
        fetchTeachers().catch(console.error);
    }, [fetchTeachers]);

    // Atualizar preview quando mudar carga ou disciplinas
    useEffect(() => {
        if (selectedSubjects.length > 0 && workload > 0) {
            const horasSemanais = workload / 4;
            const capacidade = Math.min(
                Math.floor((horasSemanais * 60) / 50),
                SCHOOL_CONFIG.MAX_AULAS_SEMANA
            );

            let aulasEstimadas = 0;
            let turmasEstimadas = 0;

            for (const disc of selectedSubjects) {
                const config = SCHOOL_CONFIG.DISCIPLINAS[disc];
                const aulasPorSemana = config?.aulasSemana || 2;

                for (const _ of SCHOOL_CONFIG.TURMAS) {
                    if (aulasEstimadas + aulasPorSemana <= capacidade) {
                        aulasEstimadas += aulasPorSemana;
                        turmasEstimadas++;
                    } else {
                        break;
                    }
                }

                if (aulasEstimadas >= capacidade) break;
            }

            setPreview({ capacidade, aulasEstimadas, turmasEstimadas });
        } else {
            setPreview(null);
        }
    }, [workload, selectedSubjects]);

    const handleSubmit = async () => {
        // Validações básicas
        if (!name.trim()) {
            addNotification('error', 'Digite o nome do professor.');
            return;
        }
        if (selectedSubjects.length === 0) {
            addNotification('error', 'Selecione pelo menos uma disciplina.');
            return;
        }

        setIsSaving(true);

        try {
            // Chamar distribuidor automático
            const occupiedClasses = getOccupiedClasses(teachers);
            const result = distributeAutomatically({
                name: name.trim(),
                workloadMonthly: workload,
                subjects: selectedSubjects,
                occupiedClasses,
                allowedClasses: allowedClasses.length > 0 ? allowedClasses : undefined // Se vazio, permite todas
            });

            // Validar resultado
            if (!result || !result.distribuicao) {
                throw new Error('Erro ao calcular distribuição de turmas.');
            }

            // Filtrar distribuições válidas (remover nulls)
            const distribuicaoValida = result.distribuicao.filter(item => {
                if (!item || !item.disciplina || !item.turmas) return false;
                // Filtrar turmas null/undefined
                item.turmas = item.turmas.filter(t => t !== null && t !== undefined && t !== '');
                return item.turmas.length > 0;
            });

            if (distribuicaoValida.length === 0) {
                throw new Error('Nenhuma turma foi alocada. Verifique a carga horária e disciplinas.');
            }

            // Criar payload para o backend
            const disciplinas = distribuicaoValida.map(item => ({
                nome: item.disciplina,
                aulasPorSemana: item.aulasPorSemana,
                turmas: item.turmas
            }));

            // Log para debug
            console.log('📤 Payload a enviar:');
            disciplinas.forEach(d => {
                console.log(`   ${d.nome}: ${d.turmas.length} turmas - [${d.turmas.join(', ')}]`);
            });

            const payload = {
                nome: name.trim(),
                cargaHoraria: workload,
                color: generateRandomColor(),
                disciplinas
            };

            // Enviar para o backend
            await addTeacherToBackend(payload);

            // Calcular estatísticas para feedback
            const totalTurmas = disciplinas.reduce((acc, d) => acc + d.turmas.length, 0);
            const totalAulas = result.stats.aulasSemanaisTotal;

            // Mostrar avisos se houver
            if (result.warning) {
                addNotification('warning', result.warning);
            }

            addNotification(
                'success',
                `Professor "${name}" salvo! ${totalAulas} aulas/semana em ${totalTurmas} turmas (${result.stats.percentualOcupacao}% da capacidade).`
            );

            // Limpar formulário
            setName('');
            setWorkload(165);
            setSelectedSubjects([]);
            setAllowedClasses([]);

        } catch (error) {
            console.error('Erro ao salvar professor:', error);

            let message = 'Erro desconhecido ao salvar professor.';
            if (error instanceof Error) {
                message = error.message;
                if (message.includes('fetch') || message.includes('Failed')) {
                    message = 'Servidor não encontrado. Verifique se o backend está rodando na porta 3000.';
                } else if (message.includes('500')) {
                    message = 'Erro interno do servidor. Verifique os logs do backend.';
                }
            }

            addNotification('error', message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <Card title="Cadastro de Professor">
                <div className="space-y-6">
                    {/* Nome */}
                    <div>
                        <Input
                            label="Nome do Professor"
                            placeholder="Ex: João Silva"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isSaving}
                        />
                    </div>

                    {/* Carga Horária */}
                    <div>
                        <Input
                            label="Carga Horária Mensal (horas)"
                            type="number"
                            value={workload}
                            onChange={(e) => setWorkload(Number(e.target.value))}
                            disabled={isSaving}
                            min={40}
                            max={200}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Padrão: 165 horas (~40h semanais). Máximo: {SCHOOL_CONFIG.MAX_AULAS_SEMANA} aulas/semana
                        </p>
                    </div>

                    {/* Disciplinas */}
                    <SubjectCheckboxList
                        selectedSubjects={selectedSubjects}
                        onChange={setSelectedSubjects}
                    />

                    {/* Filtro de Turmas Permitidas */}
                    {selectedSubjects.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                <Filter className="w-4 h-4" />
                                Restrição de Turmas (Opcional)
                            </label>
                            <ClassesFilter
                                selectedClasses={allowedClasses}
                                onChange={setAllowedClasses}
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                💡 Selecione as turmas/anos que este professor pode lecionar. Se deixar vazio, ele poderá dar aula em qualquer turma.
                            </p>
                        </div>
                    )}

                    {/* Preview da Capacidade */}
                    {preview && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-blue-800 dark:text-blue-300">Prévia da Alocação</p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                        Com {workload}h mensais → até <strong>{preview.capacidade} aulas/semana</strong>
                                    </p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        Disciplinas selecionadas → ~<strong>{preview.aulasEstimadas} aulas</strong> em ~<strong>{preview.turmasEstimadas} turmas</strong>
                                    </p>
                                    {preview.aulasEstimadas >= preview.capacidade && (
                                        <p className="text-sm text-orange-600 dark:text-orange-400 font-medium mt-1">
                                            ⚠️ Capacidade máxima atingida
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Botão Salvar */}
                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="bg-green-600 hover:bg-green-700 w-full md:w-auto disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5 mr-2" />
                                    Salvar Professor
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Dashboard de Análise Inteligente */}
            <IntelligentDashboard />

            <TeacherList />
        </div>
    );
}
