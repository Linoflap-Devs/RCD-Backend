import express from 'express'
import { validateAgentEmployeeSession, validateEmployeeSession, validateSession } from '../middleware/auth';
import { getAgentHierarchyController } from '../controller/division.controller';
import { addProjectController, editProjectController, getProjectDetailsController, getProjectListController, getProjectTypesController } from '../controller/project.controller';
import { validateRole } from '../middleware/roles';
import { addProjectSchema } from '../schema/project.schema';
import { validate } from '../middleware/zod';

const router = express.Router();

router.route('/types').get([validateAgentEmployeeSession], getProjectTypesController);
router.route('/:projectId').get([validateAgentEmployeeSession], getProjectDetailsController);
router.route('/:projectId').patch([validateEmployeeSession, validateRole(['SA'])], editProjectController);
router.route('/').post([validateEmployeeSession, validateRole(['SA']), validate(addProjectSchema)], addProjectController);
router.route('/').get([validateAgentEmployeeSession], getProjectListController);

export default router;