import express from 'express';
import { validateAgentEmployeeSession, validateEmployeeSession, validateMobileSession, validateSession } from '../middleware/auth';
import { activateDivisionController, addDivisionController, addDivisionRequestController, approveDivisionRequestController, deleteDivisionController, editDivisionController, getAgentHierarchyController, getDivisionRequestDetailsController, getDivisionRequestsController, getDivisionsController, getTop10DivisionsController } from '../controller/division.controller';
import { validateRole } from '../middleware/roles';
import { addDivisionRequestSchema } from '../schema/divisions.schema';
import { validate } from '../middleware/zod';

const router = express.Router();

router.route('/agents').get([validateMobileSession], getAgentHierarchyController);

router.route('/top-10').get([validateEmployeeSession], getTop10DivisionsController);

router.route('/activate/:divisionId').patch([validateEmployeeSession, validateRole(['AD','SA'])], activateDivisionController);

// Division Requests

router.route('/requests').get([validateSession, validateRole(['UM','SD'])], getDivisionRequestsController);
router.route('/requests').post([validateSession, validateRole(['SP']), validate(addDivisionRequestSchema)], addDivisionRequestController);
router.route('/requests/:divisionRequestId').get([validateSession, validateRole(['UM', 'SD'])], getDivisionRequestDetailsController);
router.route('/requests/approve/:divisionRequestId').patch([validateSession, validateRole(['UM'])], approveDivisionRequestController);

router.route('/:divisionId').delete([validateEmployeeSession, validateRole(['AD','SA'])], deleteDivisionController);

router.route('/:divisionId').patch([validateEmployeeSession, validateRole(['AD','SA'])], editDivisionController);

router.route('/').get([validateAgentEmployeeSession], getDivisionsController)

router.route('/').post([validateEmployeeSession, validateRole(['AD','SA'])], addDivisionController)

export default router;