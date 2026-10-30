import { Router } from 'express';
import { authGuard } from '../../middleware/auth-guard.js';
import { getConversationsList, getConversationItem } from './conversation.controller.js';

export const conversationRouter = Router();

conversationRouter.use('/conversations', authGuard);
conversationRouter.get('/conversations', getConversationsList);
conversationRouter.get('/conversations/:conversationId', getConversationItem);
