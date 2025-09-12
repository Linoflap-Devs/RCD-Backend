import express from 'express';
import { validateSession } from '../middleware/auth';
import { getAgentCommissionController, getAgentCommissionDetailsController } from '../controller/commission.controller';

const router = express.Router();


router.route('/').get([validateSession], getAgentCommissionController);
router.route('/:date').get([validateSession], getAgentCommissionDetailsController)


export default router;