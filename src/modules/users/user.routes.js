import { Router } from 'express';
import { getUserProfile } from './user.controller.js';

const router = Router();

router.get('/profile', getUserProfile);

export default router; 