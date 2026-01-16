import express from 'express'
import { validateAgentEmployeeSession } from '../middleware/auth';
import { getPositionsController } from '../controller/position.controller';

const router = express.Router();

router.route('/').get([validateAgentEmployeeSession], getPositionsController);

export default router;