import express from 'express';
import { validateSession } from '../middleware/auth';
import { getAgentHierarchyController } from '../controller/division.controller';

const router = express.Router();

router.route('/agents').get([validateSession], getAgentHierarchyController);

export default router;