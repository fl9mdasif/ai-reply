import type { Request, Response } from 'express';
import { NotFoundError } from '../../lib/errors.js';
import { listConversationsQuerySchema } from './conversation.schema.js';
import { listConversations, findConversationById } from './conversation.repo.js';

export async function getConversationsList(req: Request, res: Response): Promise<void> {
  const query = listConversationsQuerySchema.parse(req.query);
  const result = await listConversations(req.sellerId, query.limit, query.cursor);
  res.status(200).json(result);
}

export async function getConversationItem(req: Request, res: Response): Promise<void> {
  const conversation = await findConversationById(req.sellerId, req.params.conversationId as string);
  if (!conversation) throw new NotFoundError('Conversation not found');
  res.status(200).json(conversation);
}
