import express from 'express';
import { validateSession } from '../middleware/auth';
import { getDivisionSalesController, getSalesTransactionDetailController } from '../controller/sales.controller';

const router = express.Router();

router.route('/').get([validateSession], getDivisionSalesController);
router.route('/:salesTransactionId').get([validateSession], getSalesTransactionDetailController);

export default router;