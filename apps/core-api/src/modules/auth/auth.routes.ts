import { Router } from 'express';
import { loginLimiter, registerLimiter } from '../../middleware/rate-limiters.js';
import { postLogin, postRegister } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/auth/register', registerLimiter, postRegister);
authRouter.post('/auth/login', loginLimiter, postLogin);
