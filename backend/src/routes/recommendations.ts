import { Router } from 'express';
import { z } from 'zod';

import { TripService } from '../services/trip-service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AppError } from '../utils/errors.js';

const paramsSchema = z.object({
  sessionId: z.string().uuid()
});

const recommendationItemSchema = z.object({
  destinationCode: z.string().trim().min(1),
  destinationName: z.string().trim().min(1),
  score: z.number(),
  explanation: z.string().trim().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
  rank: z.number().int().positive().optional()
});

const recommendationPayloadSchema = z.object({
  recommendations: z.array(recommendationItemSchema)
});

export function createRecommendationRoutes(service: TripService) {
  const router = Router();

  router.put(
    '/sessions/:sessionId/recommendations',
    asyncHandler(async (req, res) => {
      const auth = req.auth;
      if (!auth) {
        throw new AppError(401, 'Unauthorized');
      }

      const { sessionId } = paramsSchema.parse(req.params);
      const { recommendations } = recommendationPayloadSchema.parse(req.body);
      const data = await service.setRecommendations(auth.accessToken, sessionId, recommendations);

      res.status(200).json({ data });
    })
  );

  router.get(
    '/sessions/:sessionId/recommendations',
    asyncHandler(async (req, res) => {
      const auth = req.auth;
      if (!auth) {
        throw new AppError(401, 'Unauthorized');
      }

      const { sessionId } = paramsSchema.parse(req.params);
      const recommendations = await service.listRecommendations(auth.accessToken, sessionId);

      res.status(200).json({ data: recommendations });
    })
  );

  return router;
}
