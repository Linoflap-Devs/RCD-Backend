import express from 'express';
import { editAgentDetailsController, editAgentEducationController, editAgentImageController, editAgentWorkExpController, editBrokerEducationController, editBrokerImageController, editBrokerWorkExpController, findAgentByAgentIdController, getAgentGovIdsController, getAgentUserDetailsController, getBrokerGovIdsController, getBrokersController, getBrokerUserDetailsController, getTop10SPsController, getTop10UMsController, getUsersController } from '../controller/users.controller';
import { validateBrokerSession, validateEmployeeSession, validateMobileSession, validateSession } from '../middleware/auth';
import { editAgentSchema } from '../schema/users.schema';
import { validate } from '../middleware/zod';
import { multerUpload } from '../middleware/multer';

const router = express.Router();

router.route('/').get([validateSession],getUsersController);
router.route('/user-details').get([validateSession], getAgentUserDetailsController);
router.route('/broker-details').get([validateBrokerSession], getBrokerUserDetailsController);

router.route('/user-ids').get([validateSession], getAgentGovIdsController);
router.route('/user-details').patch([validateSession, validate(editAgentSchema)], editAgentDetailsController);
router.route('/user-image').patch([validateSession, multerUpload.fields([{name: 'profileImage', maxCount: 1}])], editAgentImageController)
router.route('/user-education').patch([validateSession], editAgentEducationController);
router.route('/user-work').patch([validateSession], editAgentWorkExpController);

router.route('/brokers').get([validateSession], getBrokersController);
router.route('/broker-image').patch([validateBrokerSession, multerUpload.fields([{name: 'profileImage', maxCount: 1}])], editBrokerImageController)
router.route('/broker-education').patch([validateBrokerSession], editBrokerEducationController);
router.route('/broker-work').patch([validateBrokerSession], editBrokerWorkExpController);
router.route('/broker-ids').get([validateBrokerSession], getBrokerGovIdsController);

router.route('/top-10-um').get([validateEmployeeSession], getTop10UMsController);
router.route('/top-10-sp').get([validateEmployeeSession], getTop10SPsController);

router.route('/:agentId').get([validateSession], findAgentByAgentIdController);



export default router;