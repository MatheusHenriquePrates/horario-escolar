const API_BASE = 'http://localhost:3000/api';

export interface ValidationResult {
    valid: boolean;
    conflicts: Array<{
        type: string;
        severity: string;
        description: string;
        details: any;
    }>;
    warnings: Array<{
        type: string;
        description: string;
    }>;
    stats: {
        totalLessons: number;
        teacherUtilization: Array<{
            teacher: string;
            used: number;
            capacity: number;
            percentage: number;
        }>;
        subjectCoverage: Array<{
            subject: string;
            covered: number;
            total: number;
            percentage: number;
        }>;
        consecutiveViolations: number;
    };
    report: string;
}

export async function validateSchedule(): Promise<ValidationResult> {
    const response = await fetch(`${API_BASE}/validation/validate`);
    if (!response.ok) {
        throw new Error('Erro ao validar grade');
    }
    return response.json();
}
