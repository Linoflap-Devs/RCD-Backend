import express from 'express'
import { validateSession } from '../middleware/auth';
import { getAgentHierarchyController } from '../controller/division.controller';
import { getProjectDetailsController, getProjectListController } from '../controller/project.controller';

const router = express.Router();

router.route('/').get([validateSession], getProjectListController);
router.route('/:projectId').get([validateSession], getProjectDetailsController);
export default router;