import express from 'express';
import { validateSession } from '../middleware/auth';
import { getDivisionSalesController, getPersonalSalesController, getSalesTransactionDetailController } from '../controller/sales.controller';

const router = express.Router();

router.route('/division').get([validateSession], getDivisionSalesController);
router.route('/personal').get([validateSession], getPersonalSalesController);
router.route('/:salesTransactionId').get([validateSession], getSalesTransactionDetailController);

export default router;