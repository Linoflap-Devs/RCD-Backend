import express from 'express';
import { validateAgentEmployeeSession, validateAllSessions, validateEmployeeSession, validateSession } from '../middleware/auth';
import { getAgentTaxRatesController } from '../controller/tax.controller';

const router = express.Router();

router.route('/').get([validateAllSessions], getAgentTaxRatesController)

export default router;