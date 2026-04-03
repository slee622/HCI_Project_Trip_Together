import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../utils/errors.js';

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Invalid request payload',
      details: error.issues
    });
  }

  console.error('Unhandled error', error);

  return res.status(500).json({
    error: 'Internal server error'
  });
}
