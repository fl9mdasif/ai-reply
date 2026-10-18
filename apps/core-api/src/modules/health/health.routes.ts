import { Router } from 'express';
import { getHealth, getHealthDeps } from './health.controller.js';

export const healthRouter = Router();

healthRouter.get('/health', getHealth);
healthRouter.get('/health/deps', getHealthDeps);
