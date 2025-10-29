import express from 'express';
import { validateAgentEmployeeSession, validateEmployeeSession, validateSession } from '../middleware/auth';
import { getAgentHierarchyController, getDivisionsController, getTop10DivisionsController } from '../controller/division.controller';

const router = express.Router();

router.route('/agents').get([validateSession], getAgentHierarchyController);

router.route('/top-10').get([validateEmployeeSession], getTop10DivisionsController);

router.route('/').get([validateAgentEmployeeSession], getDivisionsController)

export default router;