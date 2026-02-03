import { Router } from 'express';
import {
    getClasses,
    getClassById,
    createClass,
    updateClass,
    deleteClass,
    generateClasses,
    getClassStats
} from '../controllers/classController';

const router = Router();

// Estatísticas
router.get('/stats', getClassStats);

// Gerar turmas em lote
router.post('/generate', generateClasses);

// CRUD
router.get('/', getClasses);
router.post('/', createClass);
router.get('/:id', getClassById);
router.put('/:id', updateClass);
router.delete('/:id', deleteClass);

export default router;
