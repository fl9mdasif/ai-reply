import type { Request, Response } from 'express';
import { ValidationError } from '../../lib/errors.js';
import { handleOAuthCallback } from './sheets-integration.service.js';

function escapeHtmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function getGoogleCallback(req: Request, res: Response): Promise<void> {
  const { state, code } = req.query;
  if (typeof state !== 'string' || typeof code !== 'string') {
    throw new ValidationError('Missing state or code');
  }

  const result = await handleOAuthCallback(state, code);
  const sheetUrl = escapeHtmlAttribute(result.googleSheetUrl);

  res.status(200).type('html').send(`<!doctype html>
<html>
<head><meta charset="utf-8"><title>Google Sheets connected</title></head>
<body style="font-family: system-ui, sans-serif; text-align: center; padding: 48px;">
  <h1>Google Sheets connected</h1>
  <p>Your orders will now be written to <a href="${sheetUrl}" target="_blank" rel="noopener">this Google Sheet</a>.</p>
  <p>You can close this window.</p>
</body>
</html>`);
}
