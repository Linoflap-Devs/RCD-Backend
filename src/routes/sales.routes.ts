import express from 'express';
import { validateSession } from '../middleware/auth';
import { getDivisionSalesController } from '../controller/sales.controller';

const router = express.Router();

router.route('/').get([validateSession], getDivisionSalesController);

export default router;