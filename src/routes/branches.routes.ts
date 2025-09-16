import express from 'express';
import { validateSession } from '../middleware/auth';
import { getBranchesController } from '../controller/branches.controller';

const router = express.Router();

router.route('/').get([], getBranchesController);

export default router;