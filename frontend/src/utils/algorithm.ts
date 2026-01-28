import type { Teacher, ScheduleGrid, ClassId, SubjectName } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper to create empty grid
export const createEmptyGrid = (): ScheduleGrid => {
    const grid: ScheduleGrid = {};
    for (let day = 0; day < 5; day++) {
        grid[day] = {};
        for (let slot = 0; slot < 7; slot++) {
            grid[day][slot] = {} as any;
            // key is ClassId, value is Lesson | null
            // We don't initialize all keys to save memory/checking, we assume undefined = null/empty
        }
    }
    return grid;
};

// Check Rule 1: Room Conflict - Is the class already booked at this time?
const isClassBusy = (grid: ScheduleGrid, day: number, slot: number, classId: ClassId): boolean => {
    return !!grid[day]?.[slot]?.[classId];
};

// Check Rule 2: Teacher Conflict - Is the teacher teaching ANYWHERE else at this time?
const isTeacherBusy = (grid: ScheduleGrid, day: number, slot: number, teacherId: string): boolean => {
    // We have to iterate all classes for this slot.
    // Optimization: In a real app we might maintain a separate teacherSchedule map.
    // For 20 classes * 1 slot, iteration is fast enough.
    const classesAtSlot = grid[day]?.[slot];
    if (!classesAtSlot) return false;

    for (const cId in classesAtSlot) {
        const lesson = classesAtSlot[cId as ClassId];
        if (lesson && lesson.teacherId === teacherId) {
            return true;
        }
    }
    return false;
};

// Check Rule 3: Max 2 consecutive lessons of same subject for same class
const hasTooManyConsecutive = (grid: ScheduleGrid, day: number, slot: number, classId: ClassId, subject: SubjectName): boolean => {
    // Check previous slots
    let consecutiveBefore = 0;
    for (let i = slot - 1; i >= 0; i--) {
        if (grid[day]?.[i]?.[classId]?.subject === subject) {
            consecutiveBefore++;
        } else {
            break;
        }
    }

    // Check next slots (though usually we are filling empty slots, but for re-fill it matters)
    let consecutiveAfter = 0;
    for (let i = slot + 1; i < 7; i++) {
        if (grid[day]?.[i]?.[classId]?.subject === subject) {
            consecutiveAfter++;
        } else {
            break;
        }
    }

    // If we place here, total consecutive is before + 1 (this) + after
    // The rule says MAX 2 consecutive. So if existing is 1, adding 1 makes 2 (OK).
    // If existing is 2, adding 1 makes 3 (FAIL).

    // Also we need to check if placing here connects two blocks (e.g. 1 before, 1 after -> total 3).
    // Or if we already have 2 before.
    if (consecutiveBefore >= 2) return true;
    if (consecutiveAfter >= 2) return true;
    if (consecutiveBefore + 1 + consecutiveAfter > 2) return true;

    // Specific check mentioned in prompt:
    // "Pode ter: Matemática 1ª e 2ª aula ✓. NÃO pode: Matemática 1ª, 2ª e 3ª aula ✗"
    return false;
};

// Check Rule 4: Workload / Daily Limit per Class (optional/implied)
// The prompt says "Turma com mais de 7 aulas por dia" - naturally bounded by 7 slots.
// "Mais de 35 aulas por semana" - naturally bounded by grid size.

export const generateSchedule = (teachers: Teacher[]): { success: boolean; grid: ScheduleGrid; error?: string } => {
    const grid = createEmptyGrid();

    // Step 2: List all needed lessons
    // "unroll" the allocations
    interface LessonRequest {
        teacherId: string;
        subject: SubjectName;
        classId: ClassId;
        id: string; // unique idea for the request
    }

    let lessonsToAllocate: LessonRequest[] = [];

    teachers.forEach(teacher => {
        teacher.allocations.forEach(alloc => {
            alloc.classes.forEach(classId => {
                for (let i = 0; i < alloc.lessonsPerWeek; i++) {
                    lessonsToAllocate.push({
                        teacherId: teacher.id,
                        subject: alloc.subject,
                        classId: classId,
                        id: uuidv4()
                    });
                }
            });
        });
    });

    // Step 3: Shuffle teachers/lessons order to avoid deterministic bias
    // The prompt says "Shuffle teachers". We can shuffle the whole lesson pile, 
    // but prioritizing by teacher might be better if we want to fill one teacher's constraints first?
    // The prompt says: "Embaralhe a ordem dos professores aleatoriamente". 
    // And "Para cada professor... PARA cada aula_necessaria".
    // So we should structure it by teacher.

    // Let's Group by teacher first
    const teacherIds = teachers.map(t => t.id);
    // Shuffle teacher IDs
    for (let i = teacherIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [teacherIds[i], teacherIds[j]] = [teacherIds[j], teacherIds[i]];
    }

    // Now iterate teachers in shuffled order
    for (const teacherId of teacherIds) {
        const teacherLessons = lessonsToAllocate.filter(l => l.teacherId === teacherId);

        // Sort lessons? Maybe hard ones first?
        // Let's just shuffle them too as "Step 4" implies loop

        for (const req of teacherLessons) {
            let allocated = false;
            let attempts = 0;
            const MAX_ATTEMPTS = 100;

            while (!allocated && attempts < MAX_ATTEMPTS) {
                attempts++;
                const day = Math.floor(Math.random() * 5);
                const slot = Math.floor(Math.random() * 7);

                // Verification 1: Class free?
                if (isClassBusy(grid, day, slot, req.classId)) continue;

                // Verification 2: Teacher free?
                if (isTeacherBusy(grid, day, slot, req.teacherId)) continue;

                // Verification 3: Consecutive Limit?
                if (hasTooManyConsecutive(grid, day, slot, req.classId, req.subject)) continue;

                // Success - Allocate
                if (!grid[day]) grid[day] = {};
                if (!grid[day][slot]) grid[day][slot] = {} as any;

                grid[day][slot][req.classId] = {
                    id: uuidv4(),
                    teacherId: req.teacherId,
                    subject: req.subject,
                    classId: req.classId,
                    day,
                    timeSlot: slot
                };
                allocated = true;
            }

            if (!allocated) {
                // Find teacher name for error
                const tName = teachers.find(t => t.id === teacherId)?.name || teacherId;
                return {
                    success: false,
                    grid,
                    error: `Não foi possível alocar todas as aulas para ${tName} (${req.subject} - ${req.classId}). Tente reduzir aulas ou reiniciar.`
                };
            }
        }
    }

    return { success: true, grid };
};
