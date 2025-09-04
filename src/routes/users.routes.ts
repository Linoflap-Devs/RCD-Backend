import express from 'express';
import { getAgentUserDetailsController, getUsersController } from '../controller/users.controller';
import { validateSession } from '../middleware/auth';

const router = express.Router();

router.route('/').get([validateSession],getUsersController);
router.route('/user-details').get([validateSession], getAgentUserDetailsController);

export default router;