import express from 'express';
import { validateEmployeeSession, validateSession } from '../middleware/auth';
import { getAgentRegistrationsController, getAgentsController } from '../controller/agent.controller';
import { validate } from '../middleware/zod';

const router = express.Router();

router.route('/').get([validateEmployeeSession], getAgentsController);
router.route('/registrations').get([validateEmployeeSession], getAgentRegistrationsController);

export default router;