import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError, type ErrorDetail } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
}

function zodDetails(error: ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

// Last middleware in the chain. Returns the uniform { error: { code, message, details? } } shape.
// Express only recognizes this as an error handler if it declares 4 params.
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const body: ErrorResponseBody = {
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: zodDetails(err) },
    };
    res.status(400).json(body);
    return;
  }

  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error({ err, requestId: req.id }, err.message);
    }
    const body: ErrorResponseBody = {
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    };
    res.status(err.status).json(body);
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    const body: ErrorResponseBody = {
      error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body' },
    };
    res.status(400).json(body);
    return;
  }

  logger.error({ err, requestId: req.id }, 'Unhandled error');
  const body: ErrorResponseBody = {
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  };
  res.status(500).json(body);
}
