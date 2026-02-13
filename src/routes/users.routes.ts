import express from 'express';
import { addBrokerController, deleteWebBrokerController, editAgentDetailsController, editAgentEducationController, editAgentGovIdsController, editAgentImageController, editAgentWorkExpController, editBrokerDetailsController, editBrokerEducationController, editBrokerImageController, editBrokerWorkExpController, editWebBrokerController, findAgentByAgentIdController, getAgentGovIdsController, getAgentUserDetailsController, getAgentUsersController, getBrokerGovIdsController, getBrokerRegistrationDetailsController, getBrokerRegistrationsController, getBrokersController, getBrokerUserDetailsController, getInviteRegistrationDetailsController, getMobileAccountsController, getOtherBrokerUserDetailsController, getTop10SPsController, getTop10UMsController, getUserInvitedEmailsController, getUsersController } from '../controller/users.controller';
import { validateAgentEmployeeSession, validateAllSessions, validateBrokerSession, validateEmployeeSession, validateMobileSession, validateSession } from '../middleware/auth';
import { addBrokerSchema, editAgentGovIdsSchema, editAgentSchema } from '../schema/users.schema';
import { validate } from '../middleware/zod';
import { multerUpload } from '../middleware/multer';
import { validateRole } from '../middleware/roles';
import { getInviteTokenDetailsController, inviteNewUserController } from '../controller/auth.controller';

const router = express.Router();

router.route('/').get([validateAgentEmployeeSession],getUsersController);
router.route('/agents').get([validateAgentEmployeeSession], getAgentUsersController)
router.route('/user-details').get([validateSession], getAgentUserDetailsController);
router.route('/broker-details').get([validateBrokerSession], getBrokerUserDetailsController);

router.route('/user-ids').get([validateSession], getAgentGovIdsController);
router.route('/user-ids').patch([validateSession, validate(editAgentGovIdsSchema)], editAgentGovIdsController)
router.route('/user-details').patch([validateSession, validate(editAgentSchema)], editAgentDetailsController);
router.route('/user-image').patch([validateSession, multerUpload.fields([{name: 'profileImage', maxCount: 1}])], editAgentImageController)
router.route('/user-education').patch([validateSession], editAgentEducationController);
router.route('/user-work').patch([validateSession], editAgentWorkExpController);

router.route('/brokers').get([validateAllSessions], getBrokersController);
router.route('/brokers').post([validateEmployeeSession, validateRole(['AD', 'SA']), validate(addBrokerSchema)], addBrokerController);
router.route('/brokers/registrations').get([validateEmployeeSession, validateRole(['AD', 'SA', 'BH'])], getBrokerRegistrationsController);
router.route('/brokers/registrations/:brokerRegistrationId').get([validateEmployeeSession, validateRole(['AD', 'SA', 'BH'])], getBrokerRegistrationDetailsController);
router.route('/brokers/:brokerId').get([validateAllSessions], getOtherBrokerUserDetailsController);
router.route('/brokers/:brokerId').patch([validateEmployeeSession, validateRole(['AD', 'SA', 'BH'])], editWebBrokerController);
router.route('/brokers/:brokerId').delete([validateEmployeeSession, validateRole(['AD', 'SA'])], deleteWebBrokerController);
router.route('/broker-ids').get([validateBrokerSession], getBrokerGovIdsController);
router.route('/broker-details').patch([validateBrokerSession], editBrokerDetailsController);
router.route('/broker-image').patch([validateBrokerSession, multerUpload.fields([{name: 'profileImage', maxCount: 1}])], editBrokerImageController)
router.route('/broker-education').patch([validateBrokerSession], editBrokerEducationController);
router.route('/broker-work').patch([validateBrokerSession], editBrokerWorkExpController);

router.route('/mobile-accounts').get([validateEmployeeSession], getMobileAccountsController)

router.route('/top-10-um').get([validateEmployeeSession], getTop10UMsController);
router.route('/top-10-sp').get([validateEmployeeSession], getTop10SPsController);

router.route('/invite-user').post([validateSession, validateRole(['UM'])], inviteNewUserController)
router.route('/referral/:referralCode').get(getInviteTokenDetailsController);

router.route('/invited').get([validateSession, validateRole(['UM'])], getUserInvitedEmailsController);
router.route('/invited/:inviteToken').get([validateSession, validateRole(['UM'])], getInviteRegistrationDetailsController);

router.route('/:agentId').get([validateSession], findAgentByAgentIdController);



export default router;