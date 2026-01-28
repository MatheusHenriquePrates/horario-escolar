import { useMemo, useState } from 'react';
import { useScheduleStore } from '../../hooks/useScheduleStore';
import { analyzeCurrentDistribution, optimizeWithAI } from '../../utils/aiOptimizer';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Brain, AlertTriangle, CheckCircle, Zap, TrendingUp } from 'lucide-react';

export function IntelligentDashboard() {
    const { teachers } = useScheduleStore();
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationResult, setOptimizationResult] = useState<any>(null);

    const analysis = useMemo(() => {
        if (teachers.length === 0) {
            return {
                score: 0,
                suggestions: ['Cadastre pelo menos um professor para começar'],
                bottlenecks: []
            };
        }
        return analyzeCurrentDistribution(teachers);
    }, [teachers]);

    const handleOptimize = async () => {
        setIsOptimizing(true);

        try {
            // Simula delay de processamento
            await new Promise(resolve => setTimeout(resolve, 1000));

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

    const getScoreLabel = (score: number) => {
        if (score >= 80) return 'Excelente';
        if (score >= 60) return 'Boa';
        if (score >= 40) return 'Regular';
        return 'Ruim';
    };

    return (
        <div className="space-y-4">
            {/* Score Geral */}
            <Card>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-800 dark:text-white">Análise Inteligente</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {teachers.length} professor{teachers.length !== 1 ? 'es' : ''} cadastrado{teachers.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`text-3xl font-bold ${getScoreColor(analysis.score)}`}>
                            {Math.round(analysis.score)}%
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{getScoreLabel(analysis.score)}</div>
                    </div>
                </div>
            </Card>

            {/* Gargalos */}
            {analysis.bottlenecks.length > 0 && (
                <Card>
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-500 dark:text-orange-400 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Gargalos Detectados</h4>
                            <ul className="space-y-1">
                                {analysis.bottlenecks.map((bottleneck, idx) => (
                                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                        <span className="text-orange-500 dark:text-orange-400">•</span>
                                        <span>{bottleneck}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>
            )}

            {/* Sugestões */}
            {analysis.suggestions.length > 0 && (
                <Card>
                    <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-1 flex-shrink-0" />
                        <div className="flex-1">
                            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Sugestões</h4>
                            <ul className="space-y-1">
                                {analysis.suggestions.map((suggestion, idx) => (
                                    <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                                        <span className="text-blue-500 dark:text-blue-400">•</span>
                                        <span>{suggestion}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>
            )}

            {/* Botão de Otimização com IA */}
            {teachers.length >= 3 && analysis.score < 90 && (
                <Card>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                                <Zap className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-800 dark:text-white">Otimização com IA</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Algoritmo genético para melhor distribuição
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleOptimize}
                            disabled={isOptimizing}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        >
                            {isOptimizing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
                </Card>
            )}

            {/* Resultado da Otimização */}
            {optimizationResult && (
                <Card>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            <h4 className="font-semibold text-gray-800 dark:text-white">Resultado da Otimização</h4>
                        </div>

                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 p-4 rounded-lg">
                            <div className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-1">
                                Score: {optimizationResult.score.toFixed(1)}/100
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                                {optimizationResult.success ? '✅ Otimização bem-sucedida!' : '⚠️  Pode melhorar'}
                            </div>
                        </div>

                        {optimizationResult.suggestions.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recomendações:</p>
                                <ul className="space-y-1">
                                    {optimizationResult.suggestions.map((sug: string, idx: number) => (
                                        <li key={idx} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                                            <span>•</span>
                                            <span>{sug}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {optimizationResult.warnings.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-2">Avisos:</p>
                                <ul className="space-y-1">
                                    {optimizationResult.warnings.map((warn: string, idx: number) => (
                                        <li key={idx} className="text-sm text-orange-600 dark:text-orange-400 flex items-start gap-2">
                                            <span>⚠️ </span>
                                            <span>{warn}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="pt-3 border-t dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                                🤖 Processado por algoritmo genético (200 gerações, população de 100)
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Explicação da IA */}
            {teachers.length >= 3 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                            <p className="font-semibold text-blue-900 dark:text-blue-300 mb-1">Como funciona a IA?</p>
                            <p className="mb-2">
                                Usamos <strong>Algoritmo Genético</strong> (inspirado em evolução natural) para encontrar
                                a melhor distribuição de turmas:
                            </p>
                            <ul className="space-y-1 text-xs">
                                <li>• <strong>População:</strong> Cria várias configurações diferentes</li>
                                <li>• <strong>Fitness:</strong> Avalia cada configuração (balanceamento, cobertura, eficiência)</li>
                                <li>• <strong>Evolução:</strong> Melhores soluções "cruzam" para criar novas gerações</li>
                                <li>• <strong>Resultado:</strong> Após 200 gerações, encontra distribuição ótima</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
