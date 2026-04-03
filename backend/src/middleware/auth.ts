import { NextFunction, Request, Response } from 'express';

import { AuthProvider } from '../services/auth-provider.js';
import { AppError } from '../utils/errors.js';

export function authMiddleware(authProvider: AuthProvider) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authorization = req.header('authorization');

      if (!authorization?.startsWith('Bearer ')) {
        throw new AppError(401, 'Missing Bearer token');
      }

      const accessToken = authorization.slice('Bearer '.length).trim();
      if (!accessToken) {
        throw new AppError(401, 'Empty Bearer token');
      }

      const user = await authProvider.verifyAccessToken(accessToken);
      req.auth = {
        userId: user.id,
        accessToken
      };

      next();
    } catch (error) {
      next(error);
    }
  };
}
