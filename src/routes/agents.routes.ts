import express from 'express';
import { validateEmployeeSession, validateSession } from '../middleware/auth';
import { addNewAgentController, editAgentController, getAgentDetailsController, getAgentRegistrationController, getAgentRegistrationsController, getAgentsController } from '../controller/agent.controller';
import { validate } from '../middleware/zod';
import { validateRole } from '../middleware/roles';
import { addAgentController } from '../controller/auth.controller';
import { addAgentSchema } from '../schema/users.schema';

const router = express.Router();

router.route('/registrations').get([validateEmployeeSession], getAgentRegistrationsController);
router.route('/registrations/:agentRegistrationId').get([validateEmployeeSession], getAgentRegistrationController);
router.route('/new').post([validateEmployeeSession, validateRole(['BH', 'SA']), validate(addAgentSchema)], addNewAgentController);
router.route('/new/:agentId').patch([validateEmployeeSession, validateRole(['BH', 'SA'])], editAgentController);
router.route('/').get([validateEmployeeSession], getAgentsController);
router.route('/').post([validateEmployeeSession, validateRole(['BH','SA'])], addAgentController);
router.route('/:agentId').get([validateEmployeeSession], getAgentDetailsController);

export default router;