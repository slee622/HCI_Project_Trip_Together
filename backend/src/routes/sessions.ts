import { Router } from 'express';
import { z } from 'zod';

import { TripService } from '../services/trip-service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AppError } from '../utils/errors.js';

const createSessionSchema = z.object({
  groupId: z.string().uuid(),
  name: z.string().trim().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sourceLocation: z.string().trim().optional()
});

const paramsSchema = z.object({
  sessionId: z.string().uuid()
});

export function createSessionsRoutes(service: TripService) {
  const router = Router();

  router.post(
    '/sessions',
    asyncHandler(async (req, res) => {
      const auth = req.auth;
      if (!auth) {
        throw new AppError(401, 'Unauthorized');
      }

      const input = createSessionSchema.parse(req.body);
      const session = await service.createSession(auth.accessToken, auth.userId, input);

      res.status(201).json({ data: session });
    })
  );

  router.get(
    '/sessions/:sessionId',
    asyncHandler(async (req, res) => {
      const auth = req.auth;
      if (!auth) {
        throw new AppError(401, 'Unauthorized');
      }

      const { sessionId } = paramsSchema.parse(req.params);
      const session = await service.getSession(auth.accessToken, sessionId);

      if (!session) {
        throw new AppError(404, 'Session not found');
      }

      res.status(200).json({ data: session });
    })
  );

  return router;
}
