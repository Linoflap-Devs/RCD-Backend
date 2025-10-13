import express from 'express';
import { validateSession } from '../middleware/auth';
import { getAgentRegistrationsController, getAgentsController } from '../controller/agent.controller';

const router = express.Router();

router.route('/').get([], getAgentsController);
router.route('/registrations').get([], getAgentRegistrationsController);

export default router;