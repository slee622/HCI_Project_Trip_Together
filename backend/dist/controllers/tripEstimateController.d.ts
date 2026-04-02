/**
 * Trip Estimate Controller
 * Handles HTTP requests for trip cost estimates
 */
import { Request, Response } from 'express';
/**
 * POST /api/trip-estimate
 * Get cost estimate for a trip to a destination
 */
export declare function getTripEstimateHandler(req: Request, res: Response): void;
/**
 * POST /api/trip-estimate/batch
 * Get cost estimates for multiple destinations at once
 * Useful for getting prices for all recommended destinations
 */
export declare function getBatchTripEstimates(req: Request, res: Response): void;
