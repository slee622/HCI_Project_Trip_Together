/**
 * Recommendation Controller
 * Handles HTTP requests for destination recommendations
 */
import { Request, Response } from 'express';
/**
 * POST /api/recommendations
 * Get ranked destination recommendations based on group preferences
 */
export declare function getRecommendations(req: Request, res: Response): void;
/**
 * GET /api/destinations
 * Get all available destinations (useful for debugging/admin)
 */
export declare function getAllDestinations(_req: Request, res: Response): void;
/**
 * GET /api/destinations/:id
 * Get a specific destination by ID
 */
export declare function getDestinationById(req: Request, res: Response): void;
