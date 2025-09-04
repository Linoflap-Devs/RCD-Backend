import express from 'express';
import { editAgentDetailsController, getAgentUserDetailsController, getUsersController } from '../controller/users.controller';
import { validateSession } from '../middleware/auth';
import { editAgentSchema } from '../schema/users.schema';
import { validate } from '../middleware/zod';

const router = express.Router();

router.route('/').get([validateSession],getUsersController);
router.route('/user-details').get([validateSession], getAgentUserDetailsController);

router.route('/user-details').patch([validateSession, validate(editAgentSchema)], editAgentDetailsController);

export default router;