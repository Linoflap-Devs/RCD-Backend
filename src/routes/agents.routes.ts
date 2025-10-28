import express from 'express';
import { validateEmployeeSession, validateSession } from '../middleware/auth';
import { getAgentDetailsController, getAgentRegistrationController, getAgentRegistrationsController, getAgentsController } from '../controller/agent.controller';
import { validate } from '../middleware/zod';
import { validateRole } from '../middleware/roles';

const router = express.Router();

router.route('/registrations').get([validateEmployeeSession, validateRole(['BH', 'SA'])], getAgentRegistrationsController);
router.route('/registrations/:agentRegistrationId').get([validateEmployeeSession, validateRole(['BH', 'SA'])], getAgentRegistrationController);
router.route('/').get([validateEmployeeSession], getAgentsController);
router.route('/:agentId').get([validateEmployeeSession], getAgentDetailsController);

export default router;