import express from 'express';
import { validateSession } from '../middleware/auth';
import { getAgentDashboardController, getWebDashboardController } from '../controller/dashboard.controller';

const router = express.Router();

router.route('/').get([validateSession], getAgentDashboardController);
router.route('/web').get(getWebDashboardController);

export default router;