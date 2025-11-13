import express from 'express';
import { validate } from '../middleware/zod';
import { registerAgentSchema } from '../schema/users.schema';
import { approveAgentRegistrationController, changeEmployeePasswordController, getCurrentAgentController, getCurrentEmployeeController, loginAgentController, loginEmployeeController, logoutAgentSessionController, registerAgentController, registerBrokerController, registerEmployeeController, rejectAgentRegistrationController, sendOTPController, updateAgentPasswordController, updateForgottenPasswordController, verifyOTPController } from '../controller/auth.controller';
import { multerUpload } from '../middleware/multer';
import { approveRegistrationSchema, changeEmployeePasswordSchema, changeForgottonPasswordSchema, changePasswordSchema, loginAgentSchema, loginEmployeeSchema, registerEmployeeSchema, rejectRegistrationSchema, verifyOTPSchema } from '../schema/auth.schema';
import { validateEmployeeSession, validateSession } from '../middleware/auth';
import { validateRole } from '../middleware/roles';

const router = express.Router();

router.route('/register-agent').post([multerUpload.fields([{name: 'profileImage', maxCount: 1}, {name: 'govId', maxCount: 1}, {name: 'selfie', maxCount: 1}]), validate(registerAgentSchema)], registerAgentController);
router.route('/login-agent').post(validate(loginAgentSchema), loginAgentController);
router.route('/logout-agent').delete(validateSession, logoutAgentSessionController);

router.route('/register-employee').post(validate(registerEmployeeSchema), registerEmployeeController)
router.route('/login-employee').post(validate(loginEmployeeSchema) ,loginEmployeeController)
router.route('/logout-employee').delete(validateEmployeeSession, logoutAgentSessionController);

router.route('/register-broker').post([multerUpload.fields([{name: 'profileImage', maxCount: 1}, {name: 'govId', maxCount: 1}, {name: 'selfie', maxCount: 1}]), validate(registerAgentSchema)], registerBrokerController);

router.route('/approve-registration').post([validateEmployeeSession, validate(approveRegistrationSchema)], approveAgentRegistrationController);
router.route('/reject-registration').post([validateEmployeeSession, validate(rejectRegistrationSchema)], rejectAgentRegistrationController);

router.route('/current-user').get(validateSession, getCurrentAgentController);
router.route('/web/current-user').get(validateEmployeeSession, getCurrentEmployeeController);

router.route('/send-otp').post(sendOTPController)
router.route('/verify-otp').post(validate(verifyOTPSchema), verifyOTPController)
router.route('/change-password').post(validate(changePasswordSchema), updateAgentPasswordController)
router.route('/forgot-password').post(validate(changeForgottonPasswordSchema), updateForgottenPasswordController)

router.route('/change-employee-password').post([validateEmployeeSession, validate(changeEmployeePasswordSchema)], changeEmployeePasswordController)

export default router;