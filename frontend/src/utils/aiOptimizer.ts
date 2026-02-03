import type { SubjectName, Teacher } from '../types';
import { SCHOOL_CONFIG } from './autoDistributor';

/**
 * 🤖 OTIMIZADOR INTELIGENTE COM ALGORITMO GENÉTICO
 *
 * Sistema de IA que usa princípios de evolução natural para encontrar
 * a melhor distribuição de turmas entre professores.
 * 
 * COMO FUNCIONA:
 * 1. Cria população inicial de soluções aleatórias
 * 2. Avalia cada solução (fitness)
 * 3. Seleciona as melhores
 * 4. Combina (crossover) e muta para criar nova geração
 * 5. Repete até encontrar solução ótima
 */

// ============================================
// TIPOS
// ============================================

interface DistributionGene {
    teacherId: string;
    subject: SubjectName;
    classes: string[];
}

interface Individual {
    genes: DistributionGene[];
    fitness: number;
}

interface OptimizationConfig {
    teachers: Teacher[];
    populationSize?: number;
    generations?: number;
    mutationRate?: number;
}

export interface OptimizationResult {
    success: boolean;
    distribution: Map<string, Map<string, string[]>>;
    score: number;
    suggestions: string[];
    warnings: string[];
    stats?: {
        generations: number;
        bestFitness: number;
        improvementRate: number;
    };
}

interface AnalysisResult {
    score: number;
    suggestions: string[];
    bottlenecks: string[];
    stats: {
        totalTeachers: number;
        totalSubjects: number;
        totalClasses: number;
        avgClassesPerTeacher: number;
        coverageBySubject: Map<string, number>;
    };
}

// ============================================
// FUNÇÕES DE AVALIAÇÃO (FITNESS)
// ============================================

/**
 * Calcula fitness (quão boa é a solução)
 * Score de 0 a 100
 */
function calculateFitness(genes: DistributionGene[]): number {
    let score = 0;

    // 1. BALANCEAMENTO ENTRE SÉRIES (40 pontos)
    const seriesBalance = new Map<string, Map<string, number>>();

    genes.forEach(gene => {
        if (!seriesBalance.has(gene.subject)) {
            seriesBalance.set(gene.subject, new Map());
        }
        const subjectMap = seriesBalance.get(gene.subject)!;

        gene.classes.forEach(classId => {
            const serie = classId.charAt(0);
            subjectMap.set(serie, (subjectMap.get(serie) || 0) + 1);
        });
    });

    let balanceScore = 0;
    seriesBalance.forEach((serieMap) => {
        const counts = Array.from(serieMap.values());
        if (counts.length > 0) {
            const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
            const variance = counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;
            balanceScore += (1 / (1 + variance)) * (40 / seriesBalance.size);
        }
    });
    score += balanceScore;

    // 2. COBERTURA DE DISCIPLINAS (30 pontos)
    const coveredSubjects = new Set(genes.map(g => g.subject)).size;
    const totalSubjects = Object.keys(SCHOOL_CONFIG.DISCIPLINAS).length;
    score += (coveredSubjects / Math.max(totalSubjects, 1)) * 30;

    // 3. EFICIÊNCIA - SEM OVERLAPS (20 pontos)
    const classesBySubject = new Map<string, Set<string>>();
    let overlaps = 0;

    genes.forEach(gene => {
        if (!classesBySubject.has(gene.subject)) {
            classesBySubject.set(gene.subject, new Set());
        }
        const existingClasses = classesBySubject.get(gene.subject)!;

        gene.classes.forEach(classId => {
            if (existingClasses.has(classId)) {
                overlaps++;
            } else {
                existingClasses.add(classId);
            }
        });
    });

    const efficiencyScore = Math.max(0, 20 - (overlaps * 2));
    score += efficiencyScore;

    // 4. UTILIZAÇÃO DE PROFESSORES (10 pontos)
    const teacherCount = new Set(genes.map(g => g.teacherId)).size;
    const utilizationScore = Math.min(teacherCount, 10);
    score += utilizationScore;

    return Math.min(100, Math.max(0, score));
}

// ============================================
// OPERADORES GENÉTICOS
// ============================================

/**
 * Cria indivíduo com distribuição aleatória
 */
function createRandomIndividual(teachers: Teacher[]): Individual {
    const genes: DistributionGene[] = [];
    const usedClasses = new Map<string, Set<string>>();

    // Embaralha professores para variedade
    const shuffledTeachers = [...teachers].sort(() => Math.random() - 0.5);

    shuffledTeachers.forEach(teacher => {
        teacher.allocations.forEach(alloc => {
            if (!usedClasses.has(alloc.subject)) {
                usedClasses.set(alloc.subject, new Set());
            }

            const availableClasses = SCHOOL_CONFIG.TURMAS.filter(
                c => !usedClasses.get(alloc.subject)!.has(c)
            );

            // Número aleatório de turmas (entre 1 e o máximo disponível)
            const numClasses = Math.min(
                Math.max(1, Math.floor(Math.random() * (availableClasses.length + 1))),
                alloc.classes.length,
                availableClasses.length
            );

            const selectedClasses: string[] = [];
            const shuffledAvailable = [...availableClasses].sort(() => Math.random() - 0.5);
            
            for (let i = 0; i < numClasses && i < shuffledAvailable.length; i++) {
                selectedClasses.push(shuffledAvailable[i]);
                usedClasses.get(alloc.subject)!.add(shuffledAvailable[i]);
            }

            if (selectedClasses.length > 0) {
                genes.push({
                    teacherId: teacher.id,
                    subject: alloc.subject,
                    classes: selectedClasses
                });
            }
        });
    });

    return {
        genes,
        fitness: calculateFitness(genes)
    };
}

/**
 * Crossover uniforme: combina genes de dois pais
 */
function crossover(parent1: Individual, parent2: Individual): Individual {
    const genes: DistributionGene[] = [];
    const maxLength = Math.max(parent1.genes.length, parent2.genes.length);

    for (let i = 0; i < maxLength; i++) {
        // 50% de chance de pegar de cada pai
        if (Math.random() < 0.5 && i < parent1.genes.length) {
            genes.push({ ...parent1.genes[i] });
        } else if (i < parent2.genes.length) {
            genes.push({ ...parent2.genes[i] });
        }
    }

    return {
        genes,
        fitness: calculateFitness(genes)
    };
}

/**
 * Mutação: altera genes aleatoriamente
 */
function mutate(individual: Individual, mutationRate: number): Individual {
    const genes = individual.genes.map(gene => {
        if (Math.random() < mutationRate) {
            const newClasses = [...gene.classes];
            
            // Tipos de mutação
            const mutationType = Math.random();
            
            if (mutationType < 0.33 && newClasses.length > 0) {
                // Troca uma turma
                const idx = Math.floor(Math.random() * newClasses.length);
                const availableClasses = SCHOOL_CONFIG.TURMAS.filter(c => !newClasses.includes(c));
                if (availableClasses.length > 0) {
                    newClasses[idx] = availableClasses[Math.floor(Math.random() * availableClasses.length)];
                }
            } else if (mutationType < 0.66 && newClasses.length > 1) {
                // Remove uma turma
                newClasses.splice(Math.floor(Math.random() * newClasses.length), 1);
            } else {
                // Adiciona uma turma
                const availableClasses = SCHOOL_CONFIG.TURMAS.filter(c => !newClasses.includes(c));
                if (availableClasses.length > 0) {
                    newClasses.push(availableClasses[Math.floor(Math.random() * availableClasses.length)]);
                }
            }
            
            return { ...gene, classes: newClasses };
        }
        return gene;
    });

    return {
        genes,
        fitness: calculateFitness(genes)
    };
}

/**
 * Seleção por torneio
 */
function tournamentSelection(population: Individual[], tournamentSize: number = 5): Individual {
    let best: Individual | null = null;
    
    for (let i = 0; i < tournamentSize; i++) {
        const idx = Math.floor(Math.random() * population.length);
        const competitor = population[idx];
        
        if (!best || competitor.fitness > best.fitness) {
            best = competitor;
        }
    }
    
    return best!;
}

// ============================================
// ALGORITMO GENÉTICO PRINCIPAL
// ============================================

/**
 * 🧬 OTIMIZAÇÃO POR ALGORITMO GENÉTICO
 */
export function optimizeWithAI(config: OptimizationConfig): OptimizationResult {
    const {
        teachers,
        populationSize = 100,
        generations = 200,
        mutationRate = 0.15
    } = config;

    if (teachers.length === 0) {
        return {
            success: false,
            distribution: new Map(),
            score: 0,
            suggestions: ['Cadastre professores para usar a otimização'],
            warnings: ['Nenhum professor encontrado']
        };
    }

    console.log(`🤖 Iniciando otimização com IA...`);
    console.log(`   📊 População: ${populationSize} | Gerações: ${generations} | Mutação: ${(mutationRate * 100).toFixed(0)}%`);

    // Criar população inicial
    let population: Individual[] = [];
    for (let i = 0; i < populationSize; i++) {
        population.push(createRandomIndividual(teachers));
    }

    let initialBestFitness = Math.max(...population.map(p => p.fitness));
    let bestEverFitness = initialBestFitness;

    // Evoluir por N gerações
    for (let gen = 0; gen < generations; gen++) {
        // Ordenar por fitness (melhor primeiro)
        population.sort((a, b) => b.fitness - a.fitness);

        // Atualizar melhor global
        if (population[0].fitness > bestEverFitness) {
            bestEverFitness = population[0].fitness;
        }

        // Log a cada 50 gerações
        if (gen % 50 === 0 || gen === generations - 1) {
            console.log(`   🧬 Geração ${gen}: Melhor = ${population[0].fitness.toFixed(1)} | Média = ${(population.reduce((a, p) => a + p.fitness, 0) / population.length).toFixed(1)}`);
        }

        // Criar nova geração
        const newPopulation: Individual[] = [];

        // Elitismo: mantém os 10% melhores
        const eliteCount = Math.max(2, Math.floor(populationSize * 0.1));
        newPopulation.push(...population.slice(0, eliteCount));

        // Preencher resto com crossover e mutação
        while (newPopulation.length < populationSize) {
            const parent1 = tournamentSelection(population);
            const parent2 = tournamentSelection(population);

            let child = crossover(parent1, parent2);
            child = mutate(child, mutationRate);

            newPopulation.push(child);
        }

        population = newPopulation;
    }

    // Melhor solução final
    population.sort((a, b) => b.fitness - a.fitness);
    const best = population[0];

    console.log(`✅ Otimização concluída!`);
    console.log(`   🎯 Fitness: ${initialBestFitness.toFixed(1)} → ${best.fitness.toFixed(1)} (+${(best.fitness - initialBestFitness).toFixed(1)})`);

    // Converter para formato de saída
    const distribution = new Map<string, Map<string, string[]>>();
    const suggestions: string[] = [];
    const warnings: string[] = [];

    best.genes.forEach(gene => {
        if (!distribution.has(gene.teacherId)) {
            distribution.set(gene.teacherId, new Map());
        }
        distribution.get(gene.teacherId)!.set(gene.subject, gene.classes);
    });

    // Análise de qualidade
    const subjectsWithTeachers = new Set(best.genes.map(g => g.subject));
    const allSubjects = Object.keys(SCHOOL_CONFIG.DISCIPLINAS) as SubjectName[];

    allSubjects.forEach(subject => {
        if (!subjectsWithTeachers.has(subject)) {
            warnings.push(`${subject}: Nenhum professor alocado`);
        }
    });

    // Gerar sugestões baseadas no score
    if (best.fitness >= 90) {
        suggestions.push('🎯 Distribuição excelente! Todas as métricas estão ótimas.');
    } else if (best.fitness >= 80) {
        suggestions.push('✅ Distribuição muito boa! Pequenos ajustes podem melhorar ainda mais.');
    } else if (best.fitness >= 70) {
        suggestions.push('👍 Distribuição boa. Considere adicionar mais professores para melhor cobertura.');
    } else if (best.fitness >= 60) {
        suggestions.push('⚠️ Distribuição regular. Recomendado redistribuir algumas disciplinas.');
    } else {
        suggestions.push('❌ Distribuição precisa melhorar. Adicione mais professores ou redistribua disciplinas.');
    }

    // Sugestões específicas
    if (warnings.length > 0) {
        suggestions.push(`📚 ${warnings.length} disciplina(s) sem professor - priorize estas contratações.`);
    }

    const improvementRate = ((best.fitness - initialBestFitness) / Math.max(initialBestFitness, 1)) * 100;
    if (improvementRate > 10) {
        suggestions.push(`📈 A otimização melhorou a distribuição em ${improvementRate.toFixed(0)}%!`);
    }

    return {
        success: best.fitness >= 60,
        distribution,
        score: best.fitness,
        suggestions,
        warnings,
        stats: {
            generations,
            bestFitness: best.fitness,
            improvementRate
        }
    };
}

// ============================================
// ANÁLISE DE DISTRIBUIÇÃO ATUAL
// ============================================

/**
 * Analisa a distribuição atual e retorna métricas + sugestões
 */
export function analyzeCurrentDistribution(teachers: Teacher[]): AnalysisResult {
    const suggestions: string[] = [];
    const bottlenecks: string[] = [];
    
    // Estatísticas
    const subjectCoverage = new Map<string, number>();
    const subjectTeachers = new Map<string, number>();
    let totalClasses = 0;

    teachers.forEach(teacher => {
        teacher.allocations.forEach(alloc => {
            const classCount = alloc.classes.length;
            totalClasses += classCount;
            subjectCoverage.set(alloc.subject, (subjectCoverage.get(alloc.subject) || 0) + classCount);
            subjectTeachers.set(alloc.subject, (subjectTeachers.get(alloc.subject) || 0) + 1);
        });
    });

    // Análise por disciplina
    const allSubjects = Object.keys(SCHOOL_CONFIG.DISCIPLINAS);
    const totalTurmas = SCHOOL_CONFIG.TURMAS.length;
    let coveredSubjects = 0;

    allSubjects.forEach(subject => {
        const coverage = subjectCoverage.get(subject) || 0;
        const teacherCount = subjectTeachers.get(subject) || 0;

        if (coverage === 0) {
            bottlenecks.push(`🔴 ${subject}: Sem professor (0/${totalTurmas} turmas)`);
        } else if (coverage < totalTurmas * 0.3) {
            bottlenecks.push(`🟠 ${subject}: Cobertura crítica (${coverage}/${totalTurmas} turmas)`);
        } else if (coverage < totalTurmas * 0.7) {
            suggestions.push(`${subject}: Cobertura parcial (${coverage}/${totalTurmas})`);
            coveredSubjects++;
        } else if (coverage < totalTurmas) {
            suggestions.push(`${subject}: Boa cobertura (${coverage}/${totalTurmas})`);
            coveredSubjects++;
        } else {
            suggestions.push(`✅ ${subject}: Cobertura completa!`);
            coveredSubjects++;
        }
    });

    // Calcular score
    const coverageScore = (coveredSubjects / Math.max(allSubjects.length, 1)) * 100;
    const balanceScore = bottlenecks.length === 0 ? 100 : Math.max(0, 100 - (bottlenecks.length * 15));
    const score = (coverageScore * 0.6 + balanceScore * 0.4);

    // Sugestões gerais
    if (teachers.length < 3) {
        suggestions.unshift('💡 Cadastre mais professores para melhor distribuição');
    }
    
    if (bottlenecks.length > allSubjects.length / 2) {
        suggestions.unshift('⚠️ Muitas disciplinas sem cobertura adequada');
    }

    return {
        score: Math.round(score),
        suggestions,
        bottlenecks,
        stats: {
            totalTeachers: teachers.length,
            totalSubjects: new Set(teachers.flatMap(t => t.allocations.map(a => a.subject))).size,
            totalClasses,
            avgClassesPerTeacher: teachers.length > 0 ? totalClasses / teachers.length : 0,
            coverageBySubject: subjectCoverage
        }
    };
}
