import express from 'express';
import { validateEmployeeSession, validateSession } from '../middleware/auth';
import { getAgentDetailsController, getAgentRegistrationController, getAgentRegistrationsController, getAgentsController } from '../controller/agent.controller';
import { validate } from '../middleware/zod';
import { validateRole } from '../middleware/roles';
import { addAgentController } from '../controller/auth.controller';

const router = express.Router();

router.route('/registrations').get([validateEmployeeSession], getAgentRegistrationsController);
router.route('/registrations/:agentRegistrationId').get([validateEmployeeSession], getAgentRegistrationController);
router.route('/').get([validateEmployeeSession], getAgentsController);
router.route('/').post([validateEmployeeSession, validateRole(['BH','SA'])], addAgentController);
router.route('/:agentId').get([validateEmployeeSession], getAgentDetailsController);

export default router;