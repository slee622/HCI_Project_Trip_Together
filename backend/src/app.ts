import cors from 'cors';
import express, { Request, Response } from 'express';

import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { AuthProvider } from './services/auth-provider.js';
import { TripService } from './services/trip-service.js';
import { createApiRouter } from './routes/index.js';

export interface AppDependencies {
  authProvider: AuthProvider;
  tripService: TripService;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  app.use('/api', authMiddleware(dependencies.authProvider), createApiRouter(dependencies.tripService));

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.use(errorHandler);

  return app;
}
