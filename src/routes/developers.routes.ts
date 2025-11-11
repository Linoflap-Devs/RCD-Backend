import express from 'express';
import { validateEmployeeSession, validateSession } from '../middleware/auth';
import { addDeveloperController, getDevelopersController } from '../controller/developers.controller';
import { validateRole } from '../middleware/roles';

const router = express.Router();

router.route('/web').get([validateEmployeeSession], getDevelopersController);
router.route('/web').post([validateEmployeeSession, validateRole(['SA'])], addDeveloperController);

export default router;