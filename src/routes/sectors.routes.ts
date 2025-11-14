import express from 'express';
import { validateAgentEmployeeSession, validateEmployeeSession, validateSession } from '../middleware/auth';
import { getSectorsController } from '../controller/sectors.controller';

const router = express.Router();

router.route('/').get([validateAgentEmployeeSession], getSectorsController)

export default router;