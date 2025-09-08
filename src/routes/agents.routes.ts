import express from 'express';
import { validateSession } from '../middleware/auth';
import { getAgentsController } from '../controller/agent.controller';

const router = express.Router();

router.route('/').get([], getAgentsController);

export default router;