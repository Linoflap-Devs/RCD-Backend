import express from 'express';
import { validateSession } from '../middleware/auth';
import { getDivisionSalesController, getPersonalSalesController, getSalesTransactionDetailController, addPendingSaleController, editPendingSalesController, getPendingSalesController, getPendingSalesDetailsController } from '../controller/sales.controller';
import { validate } from '../middleware/zod';
import { addPendingSaleSchema } from '../schema/sales.schema';
import { validateRole } from '../middleware/roles';

const router = express.Router();

router.route('/division').get([validateSession], getDivisionSalesController);
router.route('/personal').get([validateSession], getPersonalSalesController);

router.route('/pending').get([validateSession], getPendingSalesController);
router.route('/pending/:pendingSalesId').get([validateSession], getPendingSalesDetailsController);
router.route('/pending').post([validateSession, validate(addPendingSaleSchema)], addPendingSaleController);
router.route('/pending/:pendingSalesId').patch([validateSession, validateRole(['UM'])], editPendingSalesController);

router.route('/:salesTransactionId').get([validateSession], getSalesTransactionDetailController);

export default router;