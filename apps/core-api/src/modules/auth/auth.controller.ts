import type { Request, Response } from 'express';
import { loginSchema, registerSchema } from './auth.schema.js';
import { login, register } from './auth.service.js';

export async function postRegister(req: Request, res: Response): Promise<void> {
  const input = registerSchema.parse(req.body);
  const result = await register(input);
  res.status(201).json(result);
}

export async function postLogin(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const result = await login(input);
  res.status(200).json(result);
}
