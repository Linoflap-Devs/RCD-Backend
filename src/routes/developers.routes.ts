import express from 'express';
import { validateEmployeeSession, validateSession } from '../middleware/auth';
import { getDevelopersController } from '../controller/developers.controller';

const router = express.Router();

router.route('/web').get([validateSession], getDevelopersController);

export default router;