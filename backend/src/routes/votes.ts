import { Router } from 'express';
import { z } from 'zod';

import { TripService } from '../services/trip-service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AppError } from '../utils/errors.js';

const paramsSchema = z.object({
  sessionId: z.string().uuid()
});

const voteSchema = z.object({
  destinationCode: z.string().trim().min(1),
  destinationName: z.string().trim().optional(),
  voteValue: z.number().int().min(-1).max(1).default(1)
});

export function createVotesRoutes(service: TripService) {
  const router = Router();

  router.put(
    '/sessions/:sessionId/vote',
    asyncHandler(async (req, res) => {
      const auth = req.auth;
      if (!auth) {
        throw new AppError(401, 'Unauthorized');
      }

      const { sessionId } = paramsSchema.parse(req.params);
      const vote = voteSchema.parse(req.body);
      const result = await service.castVote(auth.accessToken, auth.userId, sessionId, vote);

      res.status(200).json({ data: result });
    })
  );

  router.get(
    '/sessions/:sessionId/votes',
    asyncHandler(async (req, res) => {
      const auth = req.auth;
      if (!auth) {
        throw new AppError(401, 'Unauthorized');
      }

      const { sessionId } = paramsSchema.parse(req.params);
      const votes = await service.listVotes(auth.accessToken, sessionId);

      res.status(200).json({ data: votes });
    })
  );

  return router;
}
