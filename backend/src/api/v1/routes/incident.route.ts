import { Router } from 'express';
import { reportIncident, getIncidents, getIncidentReport } from '../controllers/incident.controller.js';

const router = Router();

router.post('/', reportIncident);
router.get('/', getIncidents);
router.get('/:id/download', getIncidentReport);

export default router;
