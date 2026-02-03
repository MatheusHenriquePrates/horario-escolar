import { useMemo, useState, useEffect } from 'react';
import { useScheduleStore } from '../../hooks/useScheduleStore';
import { analyzeCurrentDistribution, optimizeWithAI, OptimizationResult } from '../../utils/aiOptimizer';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
    Brain, AlertTriangle, CheckCircle, Zap, TrendingUp, 
    Users, BookOpen, Calendar, Clock, Target, BarChart3,
    Lightbulb, RefreshCw, Download, Settings
} from 'lucide-react';

export function IntelligentDashboard() {
    const { teachers } = useScheduleStore();
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [autoOptimize, setAutoOptimize] = useState(false);

    // Análise em tempo real
    const analysis = useMemo(() => {
        if (teachers.length === 0) {
            return {
                score: 0,
                suggestions: ['👋 Cadastre pelo menos um professor para começar a análise'],
                bottlenecks: [],
                stats: {
                    totalTeachers: 0,
                    totalSubjects: 0,
                    totalClasses: 0,
                    avgClassesPerTeacher: 0
                }
            };
        }
        return analyzeCurrentDistribution(teachers);
    }, [teachers]);

    // Auto-otimização quando há mudanças significativas
    useEffect(() => {
        if (autoOptimize && teachers.length >= 3 && analysis.score < 70) {
            handleOptimize();
        }
    }, [teachers, autoOptimize]);

    const handleOptimize = async () => {
        setIsOptimizing(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            const result = optimizeWithAI({
                teachers,
                populationSize: 100,
                generations: 200,
                mutationRate: 0.15
            });

            setOptimizationResult(result);
        } catch (error) {
            console.error('Erro ao otimizar:', error);
        } finally {
            setIsOptimizing(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 dark:text-green-400';
        if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getScoreBg = (score: number) => {
        if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
        if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
        return 'bg-red-100 dark:bg-red-900/30';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 90) return '🎯 Excelente';
        if (score >= 80) return '✅ Muito Boa';
        if (score >= 70) return '👍 Boa';
        if (score >= 60) return '⚠️ Regular';
        if (score >= 40) return '⚡ Precisa Melhorar';
        return '❌ Crítico';
    };

    return (
        <div className="space-y-4">
            {/* Header com Score */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                            <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                Assistente Inteligente
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Análise e otimização automática da distribuição
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
                            {Math.round(analysis.score)}
                            <span className="text-lg font-normal text-gray-400">/100</span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {getScoreLabel(analysis.score)}
                        </div>
                    </div>
                </div>
            </Card>

            {/* Estatísticas Rápidas */}
            {teachers.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="p-3">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            <div>
                                <div className="text-2xl font-bold text-gray-800 dark:text-white">
                                    {analysis.stats?.totalTeachers || teachers.length}
                                </div>
                                <div className="text-xs text-gray-500">Professores</div>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-3">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-green-500" />
                            <div>
                                <div className="text-2xl font-bold text-gray-800 dark:text-white">
                                    {analysis.stats?.totalSubjects || new Set(teachers.flatMap(t => t.allocations.map(a => a.subject))).size}
                                </div>
                                <div className="text-xs text-gray-500">Disciplinas</div>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-3">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-orange-500" />
                            <div>
                                <div className="text-2xl font-bold text-gray-800 dark:text-white">
                                    {analysis.stats?.totalClasses || teachers.reduce((acc, t) => acc + t.allocations.reduce((a, al) => a + al.classes.length, 0), 0)}
                                </div>
                                <div className="text-xs text-gray-500">Turmas Atribuídas</div>
                            </div>
                        </div>
                    </Card>
                    <Card className="p-3">
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-purple-500" />
                            <div>
                                <div className="text-2xl font-bold text-gray-800 dark:text-white">
                                    {analysis.stats?.avgClassesPerTeacher?.toFixed(1) || (teachers.length > 0 ? (teachers.reduce((acc, t) => acc + t.allocations.reduce((a, al) => a + al.classes.length, 0), 0) / teachers.length).toFixed(1) : 0)}
                                </div>
                                <div className="text-xs text-gray-500">Média/Professor</div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Problemas Detectados */}
            {analysis.bottlenecks.length > 0 && (
                <Card className="border-l-4 border-l-orange-500">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                Problemas Detectados
                                <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full">
                                    {analysis.bottlenecks.length}
                                </span>
                            </h4>
                            <ul className="space-y-2">
                                {analysis.bottlenecks.map((bottleneck, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg">
                                        <span className="text-orange-500 font-bold">!</span>
                                        <span>{bottleneck}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>
            )}

            {/* Sugestões de Melhoria */}
            {analysis.suggestions.length > 0 && (
                <Card className="border-l-4 border-l-blue-500">
                    <div className="flex items-start gap-3">
                        <Lightbulb className="w-6 h-6 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                                Sugestões da IA
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                    {analysis.suggestions.length}
                                </span>
                            </h4>
                            <ul className="space-y-2">
                                {analysis.suggestions.slice(0, showDetails ? undefined : 3).map((suggestion, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                        <span className="text-blue-500">💡</span>
                                        <span>{suggestion}</span>
                                    </li>
                                ))}
                            </ul>
                            {analysis.suggestions.length > 3 && (
                                <button
                                    onClick={() => setShowDetails(!showDetails)}
                                    className="text-sm text-blue-600 hover:text-blue-700 mt-2"
                                >
                                    {showDetails ? 'Ver menos' : `Ver mais ${analysis.suggestions.length - 3} sugestões`}
                                </button>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* Botão de Otimização */}
            {teachers.length >= 2 && (
                <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Zap className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">Otimização Automática</h4>
                                <p className="text-sm text-purple-100">
                                    Algoritmo genético encontra a melhor distribuição
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleOptimize}
                                disabled={isOptimizing}
                                className="bg-white text-purple-600 hover:bg-purple-50"
                            >
                                {isOptimizing ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                        Otimizando...
                                    </>
                                ) : (
                                    <>
                                        <TrendingUp className="w-4 h-4 mr-2" />
                                        Otimizar Agora
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Resultado da Otimização */}
            {optimizationResult && (
                <Card className={`border-2 ${optimizationResult.success ? 'border-green-500' : 'border-yellow-500'}`}>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Target className={`w-6 h-6 ${optimizationResult.success ? 'text-green-500' : 'text-yellow-500'}`} />
                                <h4 className="font-bold text-gray-800 dark:text-white">Resultado da Otimização</h4>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-sm font-bold ${getScoreBg(optimizationResult.score)} ${getScoreColor(optimizationResult.score)}`}>
                                Score: {optimizationResult.score.toFixed(0)}/100
                            </div>
                        </div>

                        {/* Barra de progresso visual */}
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                            <div 
                                className={`h-3 rounded-full transition-all duration-500 ${
                                    optimizationResult.score >= 80 ? 'bg-green-500' :
                                    optimizationResult.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${optimizationResult.score}%` }}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Sugestões */}
                            {optimizationResult.suggestions.length > 0 && (
                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                                    <p className="text-sm font-bold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        Recomendações
                                    </p>
                                    <ul className="space-y-1">
                                        {optimizationResult.suggestions.map((sug, idx) => (
                                            <li key={idx} className="text-sm text-green-600 dark:text-green-300">
                                                {sug}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Avisos */}
                            {optimizationResult.warnings.length > 0 && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                                    <p className="text-sm font-института bold text-yellow-700 dark:text-yellow-400 mb-2 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        Avisos
                                    </p>
                                    <ul className="space-y-1">
                                        {optimizationResult.warnings.map((warn, idx) => (
                                            <li key={idx} className="text-sm text-yellow-600 dark:text-yellow-300">
                                                {warn}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t dark:border-gray-700 flex items-center justify-between">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                🤖 Processado em 200 gerações com população de 100 indivíduos
                            </p>
                            <button 
                                onClick={handleOptimize}
                                className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Rodar novamente
                            </button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Explicação - Colapsável */}
            <details className="group">
                <summary className="cursor-pointer list-none">
                    <Card className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <BarChart3 className="w-5 h-5 text-purple-500" />
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                    Como funciona o Assistente Inteligente?
                                </span>
                            </div>
                            <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                        </div>
                    </Card>
                </summary>
                <div className="mt-2 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm text-gray-700 dark:text-gray-300 space-y-3">
                    <p><strong>🧬 Algoritmo Genético:</strong> Inspirado na evolução natural para encontrar a melhor distribuição.</p>
                    <ul className="space-y-2 ml-4">
                        <li><strong>1. População Inicial:</strong> Cria 100 configurações diferentes de distribuição</li>
                        <li><strong>2. Avaliação (Fitness):</strong> Cada configuração recebe uma nota baseada em:
                            <ul className="ml-4 mt-1 text-xs text-gray-600 dark:text-gray-400">
                                <li>• Balanceamento entre séries (40%)</li>
                                <li>• Cobertura de disciplinas (30%)</li>
                                <li>• Eficiência sem conflitos (20%)</li>
                                <li>• Utilização dos professores (10%)</li>
                            </ul>
                        </li>
                        <li><strong>3. Seleção:</strong> As melhores configurações "sobrevivem"</li>
                        <li><strong>4. Crossover:</strong> Combina características das melhores soluções</li>
                        <li><strong>5. Mutação:</strong> Pequenas alterações aleatórias para diversidade</li>
                        <li><strong>6. Evolução:</strong> Repete por 200 gerações até encontrar o ótimo</li>
                    </ul>
                    <p className="text-purple-600 dark:text-purple-400 font-medium">
                        💡 Dica: Quanto mais professores e disciplinas cadastrados, melhor a IA consegue otimizar!
                    </p>
                </div>
            </details>
        </div>
    );
}
