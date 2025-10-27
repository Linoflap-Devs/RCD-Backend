import express from 'express';
import { validateEmployeeSession, validateSession } from '../middleware/auth';
import { getAgentDetailsController, getAgentRegistrationsController, getAgentsController } from '../controller/agent.controller';
import { validate } from '../middleware/zod';

const router = express.Router();

router.route('/registrations').get([validateEmployeeSession], getAgentRegistrationsController);
router.route('/').get([validateEmployeeSession], getAgentsController);
router.route('/:agentId').get([validateEmployeeSession], getAgentDetailsController);

export default router;