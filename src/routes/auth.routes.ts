import express from 'express';
import { validate } from '../middleware/zod';
import { registerAgentSchema, registerBrokerSchema, registerInviteSchema } from '../schema/users.schema';
import { approveAgentRegistrationController, approveBrokerRegistrationController, approveInviteRegistrationController, bindAccountToAgentController, bindAccountToBrokerController, changeAgentUserPasswordAdminController, changeBrokerUserPasswordAdminController, changeEmployeePasswordAdminController, changeEmployeePasswordController, editEmployeeController, getCurrentAgentController, getCurrentEmployeeController, loginAgentController, loginBrokerController, loginEmployeeController, logoutAgentSessionController, logoutBrokerSessionController, logoutEmployeeSessionController, registerAgentController, registerAgentControllerR2, registerBrokerController, registerBrokerControllerR2, registerEmployeeController, registerInviteController, rejectAgentRegistrationController, rejectBrokerRegistrationController, rejectInviteRegistrationController, revokeInviteTokenController, sendOTPController, sendOTPPinController, updateAgentPasswordController, updateForgottenPasswordController, verifyOTPController, verifyResetPinOTPController } from '../controller/auth.controller';
import { multerUpload } from '../middleware/multer';
import { approveBrokerRegistrationSchema, approveRegistrationSchema, bindAccountToAgentSchema, bindAccountToBrokerSchema, changeEmployeePasswordSchema, changeForgottonPasswordSchema, changePasswordSchema, editEmployeeSchema, loginAgentSchema, loginEmployeeSchema, registerEmployeeSchema, rejectBrokerRegistrationSchema, rejectRegistrationSchema, verifyOTPPinSchema, verifyOTPSchema, verifySendOTPSchema } from '../schema/auth.schema';
import { validateBrokerSession, validateEmployeeSession, validateSession } from '../middleware/auth';
import { validateRole } from '../middleware/roles';
import { unlinkAgentUserController, unlinkBrokerUserController } from '../controller/users.controller';

const router = express.Router();

router.route('/register-agent').post([multerUpload.fields([{name: 'profileImage', maxCount: 1}, {name: 'govId', maxCount: 1}, {name: 'selfie', maxCount: 1}]),  validate(registerAgentSchema)], registerAgentController);
router.route('/register-agent-r2').post([multerUpload.fields([{name: 'profileImage', maxCount: 1}, {name: 'govId', maxCount: 1}, {name: 'selfie', maxCount: 1}]),  validate(registerAgentSchema)], registerAgentControllerR2);

router.route('/login-agent').post(validate(loginAgentSchema), loginAgentController);
router.route('/logout-agent').delete(validateSession, logoutAgentSessionController);

router.route('/register-invite').post([multerUpload.fields([{name: 'profileImage', maxCount: 1}, {name: 'govId', maxCount: 1}, {name: 'selfie', maxCount: 1}]),  validate(registerInviteSchema)], registerInviteController);
router.route('/approve-invite-um').post([validateSession, validateRole(['UM'])], approveInviteRegistrationController)
router.route('/reject-invite-um').post([validateSession, validateRole(['UM'])], rejectInviteRegistrationController)
router.route('/revoke-invite/:inviteToken').delete([validateSession, validateRole(['UM'])], revokeInviteTokenController);

router.route('/register-employee').post(validate(registerEmployeeSchema), registerEmployeeController)
router.route('/login-employee').post(validate(loginEmployeeSchema) ,loginEmployeeController)
router.route('/edit-employee/:userId').patch([validateEmployeeSession, validateRole(['AD','SA']), validate(editEmployeeSchema)], editEmployeeController)
router.route('/logout-employee').delete(validateEmployeeSession, logoutEmployeeSessionController);

router.route('/register-broker').post([multerUpload.fields([{name: 'profileImage', maxCount: 1}, {name: 'govId', maxCount: 1}, {name: 'selfie', maxCount: 1}]), validate(registerBrokerSchema)], registerBrokerController);
router.route('/register-broker-r2').post([multerUpload.fields([{name: 'profileImage', maxCount: 1}, {name: 'govId', maxCount: 1}, {name: 'selfie', maxCount: 1}]), validate(registerBrokerSchema)], registerBrokerControllerR2);
router.route('/approve-broker-registration').post([validateEmployeeSession, validateRole(['AD','SA']), validate(approveBrokerRegistrationSchema)], approveBrokerRegistrationController);
router.route('/reject-broker-registration').post([validateEmployeeSession, validate(rejectBrokerRegistrationSchema)], rejectBrokerRegistrationController);
router.route('/unlink/broker/:brokerUserId').post([validateEmployeeSession, validateRole(['AD','SA'])], unlinkBrokerUserController);
router.route('/login-broker').post(validate(loginAgentSchema), loginBrokerController);
router.route('/logout-broker').delete(validateBrokerSession, logoutBrokerSessionController)

router.route('/create-agent-account').post([validateEmployeeSession, validateRole(['AD','SA']), validate(bindAccountToAgentSchema)], bindAccountToAgentController);
router.route('/create-broker-account').post([validateEmployeeSession, validateRole(['AD','SA']), validate(bindAccountToBrokerSchema)], bindAccountToBrokerController);

router.route('/approve-registration').post([validateEmployeeSession, validate(approveRegistrationSchema)], approveAgentRegistrationController);
router.route('/reject-registration').post([validateEmployeeSession, validate(rejectRegistrationSchema)], rejectAgentRegistrationController);
router.route('/unlink/agent/:agentUserId').post([validateEmployeeSession, validateRole(['AD','SA'])], unlinkAgentUserController);

router.route('/current-user').get(validateSession, getCurrentAgentController);
router.route('/web/current-user').get(validateEmployeeSession, getCurrentEmployeeController);

router.route('/send-otp').post(sendOTPController)
router.route('/verify-otp').post(validate(verifyOTPSchema), verifyOTPController)
router.route('/change-password').post(validate(changePasswordSchema), updateAgentPasswordController)
router.route('/forgot-password').post(validate(changeForgottonPasswordSchema), updateForgottenPasswordController)

router.route('/send-pin-otp').post([validate(verifySendOTPSchema)], sendOTPPinController)
router.route('/verify-pin-otp').post(validate(verifyOTPPinSchema), verifyResetPinOTPController)

router.route('/change-employee-password').post([validateEmployeeSession, validate(changeEmployeePasswordSchema)], changeEmployeePasswordController)

router.route('/change-password-admin').post([validateEmployeeSession, validateRole(['AD','SA'])], changeEmployeePasswordAdminController)
router.route('/change-agent-password-admin').post([validateEmployeeSession, validateRole(['AD','SA'])], changeAgentUserPasswordAdminController)
router.route('/change-broker-password-admin').post([validateEmployeeSession, validateRole(['AD','SA'])], changeBrokerUserPasswordAdminController)

export default router;