import express from 'express';
import { getUsersController } from '../controller/users.controller';
import { validateSession } from '../middleware/auth';

const router = express.Router();

router.route('/').get([validateSession],getUsersController);

export default router;