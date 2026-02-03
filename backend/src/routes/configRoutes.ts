import { Router } from 'express';
import {
    getConfig,
    updateConfig,
    getTimeSlots,
    generateTimeSlots
} from '../controllers/configController';

const router = Router();

// Configuração geral
router.get('/', getConfig);
router.put('/', updateConfig);

// Time slots
router.get('/timeslots', getTimeSlots);
router.post('/timeslots/generate', generateTimeSlots);

export default router;
