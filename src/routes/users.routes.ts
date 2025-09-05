import express from 'express';
import { editAgentDetailsController, editAgentEducationController, editAgentImageController, editAgentWorkExpController, getAgentUserDetailsController, getUsersController } from '../controller/users.controller';
import { validateSession } from '../middleware/auth';
import { editAgentSchema } from '../schema/users.schema';
import { validate } from '../middleware/zod';
import { multerUpload } from '../middleware/multer';

const router = express.Router();

router.route('/').get([validateSession],getUsersController);
router.route('/user-details').get([validateSession], getAgentUserDetailsController);

router.route('/user-details').patch([validateSession, validate(editAgentSchema)], editAgentDetailsController);
router.route('/user-image').patch([validateSession, multerUpload.fields([{name: 'profileImage', maxCount: 1}])], editAgentImageController)
router.route('/user-education').patch([validateSession], editAgentEducationController);
router.route('/user-work').patch([validateSession], editAgentWorkExpController);

export default router;