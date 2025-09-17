import express from 'express';
import { validateSession } from '../middleware/auth';
import { getDivisionSalesController, getPersonalSalesController, getSalesTransactionDetailController, addPendingSaleController, editPendingSalesController, getPendingSalesController } from '../controller/sales.controller';
import { validate } from '../middleware/zod';
import { addPendingSaleSchema } from '../schema/sales.schema';

const router = express.Router();

router.route('/division').get([validateSession], getDivisionSalesController);
router.route('/personal').get([validateSession], getPersonalSalesController);

router.route('/pending').get([validateSession], getPendingSalesController);
router.route('/pending').post([validateSession, validate(addPendingSaleSchema)], addPendingSaleController);
router.route('/pending/:pendingSalesId').patch([validateSession], editPendingSalesController);

router.route('/:salesTransactionId').get([validateSession], getSalesTransactionDetailController);

export default router;