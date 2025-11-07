import express from 'express';
import { validateAgentEmployeeSession, validateEmployeeSession, validateSession } from '../middleware/auth';
import { addDivisionController, deleteDivisionController, getAgentHierarchyController, getDivisionsController, getTop10DivisionsController } from '../controller/division.controller';
import { validateRole } from '../middleware/roles';

const router = express.Router();

router.route('/agents').get([validateSession], getAgentHierarchyController);

router.route('/top-10').get([validateEmployeeSession], getTop10DivisionsController);

router.route('/:divisionId').delete([validateEmployeeSession, validateRole(['SA'])], deleteDivisionController);

router.route('/').get([validateAgentEmployeeSession], getDivisionsController)

router.route('/').post([validateEmployeeSession, validateRole(['SA'])], addDivisionController)

export default router;