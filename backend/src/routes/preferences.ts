import { Router } from 'express';
import { z } from 'zod';

import { TripService } from '../services/trip-service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AppError } from '../utils/errors.js';

const paramsSchema = z.object({
  sessionId: z.string().uuid()
});

const upsertPreferenceSchema = z.object({
  preferenceVector: z.record(z.string(), z.any())
});

export function createPreferencesRoutes(service: TripService) {
  const router = Router();

  router.put(
    '/sessions/:sessionId/preferences',
    asyncHandler(async (req, res) => {
      const auth = req.auth;
      if (!auth) {
        throw new AppError(401, 'Unauthorized');
      }

      const { sessionId } = paramsSchema.parse(req.params);
      const { preferenceVector } = upsertPreferenceSchema.parse(req.body);
      const preference = await service.upsertPreference(
        auth.accessToken,
        auth.userId,
        sessionId,
        preferenceVector
      );

      res.status(200).json({ data: preference });
    })
  );

  router.get(
    '/sessions/:sessionId/preferences',
    asyncHandler(async (req, res) => {
      const auth = req.auth;
      if (!auth) {
        throw new AppError(401, 'Unauthorized');
      }

      const { sessionId } = paramsSchema.parse(req.params);
      const preferences = await service.listPreferences(auth.accessToken, sessionId);

      res.status(200).json({ data: preferences });
    })
  );

  return router;
}
