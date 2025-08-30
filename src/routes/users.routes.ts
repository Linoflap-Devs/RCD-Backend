import express from 'express';
import { getUsersController } from '../controller/users.controller';

const router = express.Router();

router.route('/').get(getUsersController);

export default router;