import { Router } from 'express';
import {
    getTeacherPreferences,
    updateTeacherPreferences,
    getAllPreferences,
    deleteTeacherPreferences,
    checkTeacherConflicts
} from '../controllers/preferenceController';

const router = Router();

// Lista todas as preferências
router.get('/', getAllPreferences);

// Preferências de um professor específico
router.get('/:teacherId', getTeacherPreferences);
router.put('/:teacherId', updateTeacherPreferences);
router.delete('/:teacherId', deleteTeacherPreferences);

// Verificar conflitos
router.get('/:teacherId/conflicts', checkTeacherConflicts);

export default router;
