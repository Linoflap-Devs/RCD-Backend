import express from 'express';
import { validateBrokerSession, validateEmployeeSession, validateSession } from '../middleware/auth';
import { getAgentDashboardController, getBrokerDashboardController, getWebDashboardController } from '../controller/dashboard.controller';

const router = express.Router();

router.route('/').get([validateSession], getAgentDashboardController);
router.route('/broker').get([validateBrokerSession], getBrokerDashboardController)
router.route('/web').get([validateEmployeeSession],getWebDashboardController);

export default router;