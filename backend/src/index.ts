/**
 * Trip Together Backend Server
 * Express API for destination recommendations and trip cost estimation
 */

// Load environment variables first
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import recommendationRoutes from './routes/recommendationRoutes';
import tripEstimateRoutes from './routes/tripEstimateRoutes';
import travelRoutes from './routes/travelRoutes';
import { isSkyScrappperConfigured } from './services/skyScrapperService';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Request logging (simple)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/trip-estimate', tripEstimateRoutes);
app.use('/api/travel', travelRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    statusCode: 404,
  });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    statusCode: 500,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Trip Together API server running on http://localhost:${PORT}`);
  console.log(`   Sky Scrapper API: ${isSkyScrappperConfigured() ? '✅ Configured' : '⚠️  Not configured (using mock data)'}`);
  console.log(`   - POST /api/recommendations - Get destination recommendations`);
  console.log(`   - POST /api/trip-estimate - Get trip cost estimate`);
  console.log(`   - POST /api/trip-estimate/batch - Get batch cost estimates`);
  console.log(`   - POST /api/travel/flights - Search flights (Sky Scrapper)`);
  console.log(`   - POST /api/travel/hotels - Search hotels (Sky Scrapper)`);
  console.log(`   - POST /api/travel/search - Combined flight + hotel search`);
  console.log(`   - GET /api/health - Health check`);
});

export default app;
