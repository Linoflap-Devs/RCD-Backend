import express from 'express'
import { validateSession } from '../middleware/auth';
import { getAgentHierarchyController } from '../controller/division.controller';
import { getProjectListController } from '../controller/project.controller';

const router = express.Router();

router.route('/').get([validateSession], getProjectListController);

export default router;