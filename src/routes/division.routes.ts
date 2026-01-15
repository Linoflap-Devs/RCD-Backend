import express from 'express';
import { validateAgentEmployeeSession, validateEmployeeSession, validateMobileSession, validateSession } from '../middleware/auth';
import { activateDivisionController, addDivisionController, deleteDivisionController, editDivisionController, getAgentHierarchyController, getDivisionsController, getTop10DivisionsController } from '../controller/division.controller';
import { validateRole } from '../middleware/roles';

const router = express.Router();

router.route('/agents').get([validateMobileSession], getAgentHierarchyController);

router.route('/top-10').get([validateEmployeeSession], getTop10DivisionsController);

router.route('/activate/:divisionId').patch([validateEmployeeSession, validateRole(['AD','SA'])], activateDivisionController);

router.route('/:divisionId').delete([validateEmployeeSession, validateRole(['AD','SA'])], deleteDivisionController);

router.route('/:divisionId').patch([validateEmployeeSession, validateRole(['AD','SA'])], editDivisionController);

router.route('/').get([validateAgentEmployeeSession], getDivisionsController)

router.route('/').post([validateEmployeeSession, validateRole(['AD','SA'])], addDivisionController)

export default router;