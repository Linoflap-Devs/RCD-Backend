import express from 'express';
import { validateAgentEmployeeSession, validateAllSessions, validateEmployeeSession, validateSession } from '../middleware/auth';
import { addAgentTaxRatesController, getAgentTaxRatesController } from '../controller/tax.controller';
import { validateRole } from '../middleware/roles';
import { validate } from '../middleware/zod';
import { addTaxRateSchema } from '../schema/tax.schema';

const router = express.Router();

router.route('/').get([validateAllSessions], getAgentTaxRatesController)
router.route('/').post([validateEmployeeSession, validateRole(['SA', 'AD']), validate(addTaxRateSchema)], addAgentTaxRatesController)

export default router;