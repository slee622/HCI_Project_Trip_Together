/**
 * Trip Estimate Routes
 * API endpoints for trip cost estimation
 */

import { Router } from 'express';
import {
  getTripEstimateHandler,
  getBatchTripEstimates,
} from '../controllers/tripEstimateController';

const router = Router();

/**
 * POST /api/trip-estimate
 * Get cost estimate for a trip to a destination
 * 
 * Request body:
 * {
 *   "origin": "PHL",
 *   "destinationId": "miami-fl",
 *   "travelers": 4,
 *   "departureDate": "2026-04-20",
 *   "returnDate": "2026-04-25"
 * }
 * 
 * Response:
 * {
 *   "destinationId": "miami-fl",
 *   "low": 1800,
 *   "mid": 2300,
 *   "high": 2900,
 *   "breakdown": {
 *     "flightPerPersonEstimate": 220,
 *     "hotelPerNightEstimate": 180,
 *     "nights": 5,
 *     "roomsNeeded": 2
 *   }
 * }
 */
router.post('/', getTripEstimateHandler);

/**
 * POST /api/trip-estimate/batch
 * Get cost estimates for multiple destinations at once
 * 
 * Request body:
 * {
 *   "origin": "PHL",
 *   "destinationIds": ["miami-fl", "new-york-ny", "los-angeles-ca"],
 *   "travelers": 4,
 *   "departureDate": "2026-04-20",
 *   "returnDate": "2026-04-25"
 * }
 * 
 * Response:
 * {
 *   "estimates": [
 *     { "destinationId": "miami-fl", "low": 1800, ... },
 *     { "destinationId": "new-york-ny", "low": 2100, ... }
 *   ]
 * }
 */
router.post('/batch', getBatchTripEstimates);

export default router;
