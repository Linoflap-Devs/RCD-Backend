import express from 'express';
import { validateEmployeeSession, validateSession } from '../middleware/auth';
import { getAgentHierarchyController, getTop10DivisionsController } from '../controller/division.controller';

const router = express.Router();

router.route('/agents').get([validateSession], getAgentHierarchyController);

router.route('/top-10').get([validateEmployeeSession], getTop10DivisionsController);

export default router;