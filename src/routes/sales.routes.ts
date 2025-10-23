import express from 'express';
import { validateEmployeeSession, validateSession } from '../middleware/auth';
import { getDivisionSalesController, getPersonalSalesController, getSalesTransactionDetailController, addPendingSaleController, editPendingSalesController, getPendingSalesController, getPendingSalesDetailsController, rejectPendingSalesController, approvePendingSalesController, getCombinedPersonalSalesController, approvePendingSalesSDController, approvePendingSalesBHController } from '../controller/sales.controller';
import { validate } from '../middleware/zod';
import { addPendingSaleSchema } from '../schema/sales.schema';
import { validateRole } from '../middleware/roles';

const router = express.Router();

router.route('/division').get([validateSession], getDivisionSalesController);
router.route('/personal').get([validateSession], getPersonalSalesController);

router.route('/pending').get([validateSession, validateRole(['UM', 'SD'])], getPendingSalesController);
router.route('/pending/:pendingSalesId').get([validateSession], getPendingSalesDetailsController);
router.route('/pending').post([validateSession, validate(addPendingSaleSchema)], addPendingSaleController);
router.route('/pending/:pendingSalesId').patch([validateSession, validateRole(['UM'])], editPendingSalesController);
router.route('/pending/reject/:pendingSalesId').patch([validateSession, validateRole(['UM', 'SD'])], rejectPendingSalesController);
router.route('/pending/approve/:pendingSalesId').patch([validateSession, validateRole(['SD'])], approvePendingSalesSDController);

router.route('/pending/approve/bh/:pendingSalesId').patch([validateEmployeeSession, validateRole(['BH'])], approvePendingSalesBHController);

router.route('/combined').get([validateSession], getCombinedPersonalSalesController);

router.route('/:salesTransactionId').get([validateSession], getSalesTransactionDetailController);

export default router;