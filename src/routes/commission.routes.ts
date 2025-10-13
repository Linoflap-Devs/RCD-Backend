import express from 'express';
import { validateEmployeeSession, validateSession } from '../middleware/auth';
import { getAgentCommissionController, getAgentCommissionDetailsController, getCommissionForecastController } from '../controller/commission.controller';

const router = express.Router();


router.route('/').get([validateSession], getAgentCommissionController);
router.route('/forecast').get([validateEmployeeSession],getCommissionForecastController);
router.route('/:date').get([validateSession], getAgentCommissionDetailsController)


export default router;