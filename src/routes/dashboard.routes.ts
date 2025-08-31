import express from 'express';
import { validateSession } from '../middleware/auth';
import { getAgentDashboardController } from '../controller/dashboard.controller';

const router = express.Router();

router.route('/').get([validateSession], getAgentDashboardController);

export default router;