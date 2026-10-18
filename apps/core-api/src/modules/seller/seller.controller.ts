import type { Request, Response } from 'express';
import { connectFacebookSchema, patchMeSchema } from './seller.schema.js';
import {
  buildSheetsConsentUrl,
  connectFacebook,
  disconnectFacebook,
  getMe,
  patchMe,
} from './seller.service.js';

export async function getMeHandler(req: Request, res: Response): Promise<void> {
  const profile = await getMe(req.sellerId);
  res.status(200).json(profile);
}

export async function patchMeHandler(req: Request, res: Response): Promise<void> {
  const input = patchMeSchema.parse(req.body);
  const profile = await patchMe(req.sellerId, input);
  res.status(200).json(profile);
}

export async function postConnectFacebookHandler(req: Request, res: Response): Promise<void> {
  const input = connectFacebookSchema.parse(req.body);
  const result = await connectFacebook(req.sellerId, input);
  res.status(200).json(result);
}

export async function deleteConnectFacebookHandler(req: Request, res: Response): Promise<void> {
  const result = await disconnectFacebook(req.sellerId);
  res.status(200).json(result);
}

export function getSheetsUrlHandler(req: Request, res: Response): void {
  const result = buildSheetsConsentUrl(req.sellerId);
  res.status(200).json(result);
}
