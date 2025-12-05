import express from 'express';
import { validateAgentEmployeeSession, validateAllSessions, validateEmployeeSession, validateSession } from '../middleware/auth';
import { addAgentTaxRatesController, editAgentTaxRateController, getAgentTaxRatesController } from '../controller/tax.controller';
import { validateRole } from '../middleware/roles';
import { validate } from '../middleware/zod';
import { addTaxRateSchema, editTaxRateSchema } from '../schema/tax.schema';

const router = express.Router();

router.route('/').get([validateAllSessions], getAgentTaxRatesController)
router.route('/').post([validateEmployeeSession, validateRole(['SA', 'AD']), validate(addTaxRateSchema)], addAgentTaxRatesController)
router.route('/:agentTaxRateId').patch([validateEmployeeSession, validateRole(['SA', 'AD']), validate(editTaxRateSchema)], editAgentTaxRateController)

export default router;