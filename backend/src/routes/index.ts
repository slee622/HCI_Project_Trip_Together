import { Router } from 'express';

import { TripService } from '../services/trip-service.js';
import { createGroupsRoutes } from './groups.js';
import { createPreferencesRoutes } from './preferences.js';
import { createRecommendationRoutes } from './recommendations.js';
import { createSelectionRoutes } from './selection.js';
import { createSessionsRoutes } from './sessions.js';
import { createVotesRoutes } from './votes.js';

export function createApiRouter(service: TripService) {
  const router = Router();

  router.use(createGroupsRoutes(service));
  router.use(createSessionsRoutes(service));
  router.use(createPreferencesRoutes(service));
  router.use(createVotesRoutes(service));
  router.use(createRecommendationRoutes(service));
  router.use(createSelectionRoutes(service));

  return router;
}
