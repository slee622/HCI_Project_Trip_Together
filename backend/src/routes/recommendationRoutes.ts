/**
 * Recommendation Routes
 * API endpoints for destination recommendations
 */

import { Router } from 'express';
import {
  getRecommendations,
  getAllDestinations,
  getDestinationById,
} from '../controllers/recommendationController';

const router = Router();

/**
 * POST /api/recommendations
 * Get ranked destination recommendations based on group preferences
 * 
 * Request body:
 * {
 *   "preferences": {
 *     "temperature": 8,
 *     "budget": 3,
 *     "urban": 7,
 *     "nature": 4,
 *     "food": 8,
 *     "nightlife": 6,
 *     "relaxation": 5
 *   },
 *   "limit": 10
 * }
 * 
 * Response:
 * {
 *   "recommendations": [
 *     {
 *       "id": "miami-fl",
 *       "city": "Miami",
 *       "state": "FL",
 *       "latitude": 25.7617,
 *       "longitude": -80.1918,
 *       "score": 91,
 *       "reason": "Great fit for warm weather, food, and city preferences."
 *     }
 *   ]
 * }
 */
router.post('/', getRecommendations);

/**
 * GET /api/destinations
 * Get all available destinations
 */
router.get('/destinations', getAllDestinations);

/**
 * GET /api/destinations/:id
 * Get a specific destination by ID
 */
router.get('/destinations/:id', getDestinationById);

export default router;
