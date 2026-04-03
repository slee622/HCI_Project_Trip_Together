import { Router } from 'express';
import { z } from 'zod';

import { TripService } from '../services/trip-service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AppError } from '../utils/errors.js';

const paramsSchema = z.object({
  sessionId: z.string().uuid()
});

const selectionSchema = z.object({
  destinationCode: z.string().trim().min(1),
  reasoning: z.string().trim().optional()
});

export function createSelectionRoutes(service: TripService) {
  const router = Router();

  router.put(
    '/sessions/:sessionId/selection',
    asyncHandler(async (req, res) => {
      const auth = req.auth;
      if (!auth) {
        throw new AppError(401, 'Unauthorized');
      }

      const { sessionId } = paramsSchema.parse(req.params);
      const payload = selectionSchema.parse(req.body);
      const selection = await service.setSelection(auth.accessToken, auth.userId, sessionId, payload);

      res.status(200).json({ data: selection });
    })
  );

  router.get(
    '/sessions/:sessionId/selection',
    asyncHandler(async (req, res) => {
      const auth = req.auth;
      if (!auth) {
        throw new AppError(401, 'Unauthorized');
      }

      const { sessionId } = paramsSchema.parse(req.params);
      const selection = await service.getSelection(auth.accessToken, sessionId);

      if (!selection) {
        throw new AppError(404, 'Selected destination not set');
      }

      res.status(200).json({ data: selection });
    })
  );

  return router;
}
