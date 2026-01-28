import type { SubjectName, Teacher } from '../types';
import { SCHOOL_CONFIG } from './autoDistributor';

/**
 * 🤖 OTIMIZADOR INTELIGENTE COM ALGORITMO GENÉTICO
 *
 * Usa princípios de evolução para encontrar a melhor distribuição:
 * - População: Diferentes configurações de distribuição
 * - Fitness: Quão boa é a distribuição (balanceamento, eficiência)
 * - Crossover: Combina soluções boas
 * - Mutação: Pequenas alterações aleatórias
 * - Seleção: Melhores soluções "sobrevivem"
 */

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

interface OptimizationResult {
    success: boolean;
    distribution: Map<string, Map<string, string[]>>; // teacherId -> subject -> classes[]
    score: number;
    suggestions: string[];
    warnings: string[];
}

/**
 * Calcula fitness (quão boa é a solução)
 * Maior = Melhor
 */
function calculateFitness(genes: DistributionGene[]): number {
    let score = 0;

    // 1. Balanceamento entre séries (peso 40%)
    const seriesBalance = new Map<string, Map<string, number>>(); // subject -> serie -> count

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

    seriesBalance.forEach((serieMap, subject) => {
        const counts = Array.from(serieMap.values());
        if (counts.length > 0) {
            const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
            const variance = counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;
            // Menor variância = melhor balanceamento
            score += (1 / (1 + variance)) * 40;
        }
    });

    // 2. Cobertura de disciplinas (peso 30%)
    const subjectCoverage = new Set(genes.map(g => g.subject)).size;
    const totalSubjects = Object.keys(SCHOOL_CONFIG.DISCIPLINAS).length;
    score += (subjectCoverage / totalSubjects) * 30;

    // 3. Eficiência (turmas sem overlap) (peso 20%)
    const classesBySubject = new Map<string, Set<string>>();
    let overlaps = 0;

    genes.forEach(gene => {
        if (!classesBySubject.has(gene.subject)) {
            classesBySubject.set(gene.subject, new Set());
        }
        const existingClasses = classesBySubject.get(gene.subject)!;

        gene.classes.forEach(classId => {
            if (existingClasses.has(classId)) {
                overlaps++; // Penalidade por turma duplicada
            } else {
                existingClasses.add(classId);
            }
        });
    });

    score -= overlaps * 5;

    // 4. Utilização de professores (peso 10%)
    const teacherUtilization = genes.length > 0 ? genes.length / 10 : 0;
    score += Math.min(teacherUtilization, 10);

    return Math.max(0, score);
}

/**
 * Cria indivíduo inicial (distribuição aleatória)
 */
function createRandomIndividual(teachers: Teacher[]): Individual {
    const genes: DistributionGene[] = [];
    const usedClasses = new Map<string, Set<string>>();

    teachers.forEach(teacher => {
        teacher.allocations.forEach(alloc => {
            if (!usedClasses.has(alloc.subject)) {
                usedClasses.set(alloc.subject, new Set());
            }

            const availableClasses = SCHOOL_CONFIG.TURMAS.filter(
                c => !usedClasses.get(alloc.subject)!.has(c)
            );

            // Pega quantidade aleatória de turmas
            const numClasses = Math.min(
                Math.floor(Math.random() * (availableClasses.length + 1)),
                alloc.classes.length
            );

            const selectedClasses: string[] = [];
            for (let i = 0; i < numClasses; i++) {
                if (availableClasses.length > 0) {
                    const idx = Math.floor(Math.random() * availableClasses.length);
                    const classId = availableClasses.splice(idx, 1)[0];
                    selectedClasses.push(classId);
                    usedClasses.get(alloc.subject)!.add(classId);
                }
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
 * Crossover: combina dois indivíduos
 */
function crossover(parent1: Individual, parent2: Individual): Individual {
    const midpoint = Math.floor(parent1.genes.length / 2);
    const genes = [
        ...parent1.genes.slice(0, midpoint),
        ...parent2.genes.slice(midpoint)
    ];

    return {
        genes,
        fitness: calculateFitness(genes)
    };
}

/**
 * Mutação: altera aleatoriamente alguns genes
 */
function mutate(individual: Individual, mutationRate: number): Individual {
    const genes = individual.genes.map(gene => {
        if (Math.random() < mutationRate) {
            // Mutação: troca uma turma aleatoriamente
            const newClasses = [...gene.classes];
            if (newClasses.length > 0 && Math.random() < 0.5) {
                const idx = Math.floor(Math.random() * newClasses.length);
                const randomClass = SCHOOL_CONFIG.TURMAS[
                    Math.floor(Math.random() * SCHOOL_CONFIG.TURMAS.length)
                ];
                newClasses[idx] = randomClass;
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
 * 🧬 OTIMIZAÇÃO POR ALGORITMO GENÉTICO
 */
export function optimizeWithAI(config: OptimizationConfig): OptimizationResult {
    const {
        teachers,
        populationSize = 50,
        generations = 100,
        mutationRate = 0.1
    } = config;

    console.log(`🤖 Iniciando otimização com IA...`);
    console.log(`   População: ${populationSize}, Gerações: ${generations}`);

    // Criar população inicial
    let population: Individual[] = [];
    for (let i = 0; i < populationSize; i++) {
        population.push(createRandomIndividual(teachers));
    }

    // Evoluir por N gerações
    for (let gen = 0; gen < generations; gen++) {
        // Ordenar por fitness
        population.sort((a, b) => b.fitness - a.fitness);

        // Logar progresso a cada 20 gerações
        if (gen % 20 === 0) {
            console.log(`   Geração ${gen}: Melhor fitness = ${population[0].fitness.toFixed(2)}`);
        }

        // Criar nova geração
        const newPopulation: Individual[] = [];

        // Elitismo: mantém os 10% melhores
        const eliteCount = Math.floor(populationSize * 0.1);
        newPopulation.push(...population.slice(0, eliteCount));

        // Preencher resto com crossover e mutação
        while (newPopulation.length < populationSize) {
            // Seleção por torneio
            const parent1 = population[Math.floor(Math.random() * Math.min(10, population.length))];
            const parent2 = population[Math.floor(Math.random() * Math.min(10, population.length))];

            let child = crossover(parent1, parent2);
            child = mutate(child, mutationRate);

            newPopulation.push(child);
        }

        population = newPopulation;
    }

    // Melhor solução
    population.sort((a, b) => b.fitness - a.fitness);
    const best = population[0];

    console.log(`✅ Otimização concluída! Fitness final: ${best.fitness.toFixed(2)}`);

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

    if (best.fitness >= 80) {
        suggestions.push('✅ Distribuição excelente! Bem balanceada entre séries.');
    } else if (best.fitness >= 60) {
        suggestions.push('⚠️  Distribuição boa, mas pode melhorar. Considere adicionar mais professores.');
    } else {
        suggestions.push('❌ Distribuição ruim. Adicione mais professores ou redistribua disciplinas.');
    }

    return {
        success: best.fitness >= 50,
        distribution,
        score: best.fitness,
        suggestions,
        warnings
    };
}

/**
 * Analisa distribuição atual e dá sugestões
 */
export function analyzeCurrentDistribution(teachers: Teacher[]): {
    score: number;
    suggestions: string[];
    bottlenecks: string[];
} {
    const suggestions: string[] = [];
    const bottlenecks: string[] = [];

    // Verificar cobertura de disciplinas
    const subjectCoverage = new Map<string, number>();
    const subjectTeachers = new Map<string, number>();

    teachers.forEach(teacher => {
        teacher.allocations.forEach(alloc => {
            subjectCoverage.set(alloc.subject, (subjectCoverage.get(alloc.subject) || 0) + alloc.classes.length);
            subjectTeachers.set(alloc.subject, (subjectTeachers.get(alloc.subject) || 0) + 1);
        });
    });

    // Verificar disciplinas sem cobertura
    const allSubjects = Object.keys(SCHOOL_CONFIG.DISCIPLINAS);
    allSubjects.forEach(subject => {
        const coverage = subjectCoverage.get(subject) || 0;
        const teacherCount = subjectTeachers.get(subject) || 0;
        const total = SCHOOL_CONFIG.TURMAS.length;

        if (coverage === 0) {
            bottlenecks.push(`${subject}: SEM PROFESSORES (0/${total} turmas)`);
            suggestions.push(`Adicione professor para ${subject}`);
        } else if (coverage < total * 0.5) {
            bottlenecks.push(`${subject}: Cobertura baixa (${coverage}/${total} turmas, ${teacherCount} professor${teacherCount > 1 ? 'es' : ''})`);
            suggestions.push(`${subject} precisa de mais professores`);
        } else if (coverage === total) {
            suggestions.push(`${subject}: ✅ Cobertura completa`);
        }
    });

    // Calcular score geral
    const coveredSubjects = allSubjects.filter(s => (subjectCoverage.get(s) || 0) > 0).length;
    const score = (coveredSubjects / allSubjects.length) * 100;

    return { score, suggestions, bottlenecks };
}
