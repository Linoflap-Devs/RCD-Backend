import express from 'express';
import { validate } from '../middleware/zod';
import { registerAgentSchema } from '../schema/users.schema';
import { approveAgentRegistrationController, getCurrentAgentController, loginAgentController, loginEmployeeController, logoutAgentSessionController, registerAgentController, sendOTPController, updateAgentPasswordController, updateForgottenPasswordController, verifyOTPController } from '../controller/auth.controller';
import { multerUpload } from '../middleware/multer';
import { approveRegistrationSchema, changeForgottonPasswordSchema, changePasswordSchema, loginAgentSchema, loginEmployeeSchema, verifyOTPSchema } from '../schema/auth.schema';
import { validateEmployeeSession, validateSession } from '../middleware/auth';
import { validateRole } from '../middleware/roles';

const router = express.Router();

router.route('/register-agent').post([multerUpload.fields([{name: 'profileImage', maxCount: 1}]),validate(registerAgentSchema)], registerAgentController);
router.route('/login-agent').post(validate(loginAgentSchema), loginAgentController);
router.route('/logout-agent').delete(validateSession, logoutAgentSessionController);

router.route('/login-employee').post(validate(loginEmployeeSchema) ,loginEmployeeController)
router.route('/logout-employee').delete(validateEmployeeSession, logoutAgentSessionController);

router.route('/approve-registration').post([validateSession, validateRole(['UM', 'SD']), validate(approveRegistrationSchema)], approveAgentRegistrationController);

router.route('/current-user').get(validateSession, getCurrentAgentController);

router.route('/send-otp').post(sendOTPController)
router.route('/verify-otp').post(validate(verifyOTPSchema), verifyOTPController)
router.route('/change-password').post(validate(changePasswordSchema), updateAgentPasswordController)
router.route('/forgot-password').post(validate(changeForgottonPasswordSchema), updateForgottenPasswordController)

export default router;