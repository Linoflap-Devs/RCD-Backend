import express from 'express';
import { validate } from '../middleware/zod';
import { registerAgentSchema } from '../schema/users.schema';
import { registerAgentController } from '../controller/auth.controller';
import { multerUpload } from '../middleware/multer';

const router = express.Router();

router.route('/register-agent').post([multerUpload.fields([{name: 'profileImage', maxCount: 1}]),validate(registerAgentSchema)], registerAgentController);

export default router;