import express from 'express'
import { validateAgentEmployeeSession, validateEmployeeSession, validateSession } from '../middleware/auth';
import { getAgentHierarchyController } from '../controller/division.controller';
import { addProjectController, getProjectDetailsController, getProjectListController } from '../controller/project.controller';
import { validateRole } from '../middleware/roles';
import { addProjectSchema } from '../schema/project.schema';
import { validate } from '../middleware/zod';

const router = express.Router();

router.route('/:projectId').get([validateAgentEmployeeSession], getProjectDetailsController);
router.route('/').post([validateEmployeeSession, validateRole(['SA']), validate(addProjectSchema)], addProjectController);
router.route('/').get([validateAgentEmployeeSession], getProjectListController);

export default router;