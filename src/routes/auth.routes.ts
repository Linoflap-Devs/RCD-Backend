import express from 'express';
import { validate } from '../middleware/zod';
import { registerAgentSchema } from '../schema/users.schema';
import { approveAgentRegistrationController, getCurrentAgentController, loginAgentController, registerAgentController } from '../controller/auth.controller';
import { multerUpload } from '../middleware/multer';
import { approveRegistrationSchema, loginAgentSchema } from '../schema/auth.schema';
import { validateSession } from '../middleware/auth';

const router = express.Router();

router.route('/register-agent').post([multerUpload.fields([{name: 'profileImage', maxCount: 1}]),validate(registerAgentSchema)], registerAgentController);
router.route('/login-agent').post(validate(loginAgentSchema), loginAgentController);

router.route('/approve-registration').post(validate(approveRegistrationSchema), approveAgentRegistrationController);

router.route('/current-user').get(validateSession, getCurrentAgentController);

export default router;