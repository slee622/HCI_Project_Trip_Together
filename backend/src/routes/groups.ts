import { Router } from 'express';
import { z } from 'zod';

import { TripService } from '../services/trip-service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AppError } from '../utils/errors.js';

const createGroupSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional()
});

const inviteSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'member']).default('member')
});

const paramsSchema = z.object({
  groupId: z.string().uuid()
});

export function createGroupsRoutes(service: TripService) {
  const router = Router();

  router.post(
    '/groups',
    asyncHandler(async (req, res) => {
      const auth = req.auth;
      if (!auth) {
        throw new AppError(401, 'Unauthorized');
      }

      const input = createGroupSchema.parse(req.body);
      const group = await service.createGroup(auth.accessToken, auth.userId, input);

      res.status(201).json({ data: group });
    })
  );

  router.post(
    '/groups/:groupId/invite',
    asyncHandler(async (req, res) => {
      const auth = req.auth;
      if (!auth) {
        throw new AppError(401, 'Unauthorized');
      }

      const { groupId } = paramsSchema.parse(req.params);
      const input = inviteSchema.parse(req.body);
      const membership = await service.inviteToGroup(auth.accessToken, auth.userId, groupId, input);

      res.status(200).json({ data: membership });
    })
  );

  router.post(
    '/groups/:groupId/join',
    asyncHandler(async (req, res) => {
      const auth = req.auth;
      if (!auth) {
        throw new AppError(401, 'Unauthorized');
      }

      const { groupId } = paramsSchema.parse(req.params);
      const membership = await service.joinGroup(auth.accessToken, auth.userId, groupId);

      res.status(200).json({ data: membership });
    })
  );

  return router;
}
