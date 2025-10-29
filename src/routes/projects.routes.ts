import express from 'express'
import { validateAgentEmployeeSession, validateSession } from '../middleware/auth';
import { getAgentHierarchyController } from '../controller/division.controller';
import { getProjectDetailsController, getProjectListController } from '../controller/project.controller';

const router = express.Router();

router.route('/').get([validateAgentEmployeeSession], getProjectListController);
router.route('/:projectId').get([validateAgentEmployeeSession], getProjectDetailsController);
export default router;