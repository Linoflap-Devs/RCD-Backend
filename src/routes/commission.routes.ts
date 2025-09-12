import express from 'express';
import { validateSession } from '../middleware/auth';
import { getAgentCommissionController } from '../controller/commission.controller';

const router = express.Router();

router.route('/').get([validateSession], getAgentCommissionController);

export default router;