import express from 'express';
import { validateEmployeeSession, validateSession } from '../middleware/auth';
import { getAgentDashboardController, getWebDashboardController } from '../controller/dashboard.controller';

const router = express.Router();

router.route('/').get([validateSession], getAgentDashboardController);
router.route('/web').get([validateEmployeeSession],getWebDashboardController);

export default router;