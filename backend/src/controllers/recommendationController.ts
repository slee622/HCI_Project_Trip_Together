/**
 * Recommendation Controller
 * Handles HTTP requests for destination recommendations
 */

import { Request, Response } from 'express';
import { rankDestinations } from '../services/recommendationService';
import {
  Destination,
  RecommendationRequest,
  RecommendationResponse,
  GroupPreferences,
} from '../types';

// Load destinations data
import destinations from '../../data/destinations.json';

// Type assertion for imported JSON
const destinationsData: Destination[] = destinations as Destination[];

/**
 * Validate that preferences are within valid range (0-10)
 */
function validatePreferences(preferences: GroupPreferences): string | null {
  const fields: (keyof GroupPreferences)[] = [
    'temperature',
    'budget',
    'urban',
    'nature',
    'food',
    'nightlife',
    'relaxation',
  ];

  for (const field of fields) {
    const value = preferences[field];
    if (typeof value !== 'number' || value < 0 || value > 10) {
      return `Invalid ${field}: must be a number between 0 and 10`;
    }
  }

  return null;
}

/**
 * POST /api/recommendations
 * Get ranked destination recommendations based on group preferences
 */
export function getRecommendations(req: Request, res: Response): void {
  try {
    const body = req.body as RecommendationRequest;

    // Validate request body
    if (!body.preferences) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'preferences object is required',
        statusCode: 400,
      });
      return;
    }

    // Validate preference values
    const validationError = validatePreferences(body.preferences);
    if (validationError) {
      res.status(400).json({
        error: 'Bad Request',
        message: validationError,
        statusCode: 400,
      });
      return;
    }

    // Default limit to 10 if not specified
    const limit = body.limit && body.limit > 0 ? body.limit : 10;

    // TODO: When auth/groups are integrated, fetch group preferences from database
    // const groupId = body.groupId;
    // const groupPreferences = await getGroupPreferences(groupId);

    // Get ranked recommendations
    const recommendations = rankDestinations(
      destinationsData,
      body.preferences,
      undefined, // Use default weights
      limit
    );

    const response: RecommendationResponse = {
      recommendations,
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get recommendations',
      statusCode: 500,
    });
  }
}

/**
 * GET /api/destinations
 * Get all available destinations (useful for debugging/admin)
 */
export function getAllDestinations(_req: Request, res: Response): void {
  try {
    res.json({
      destinations: destinationsData,
      count: destinationsData.length,
    });
  } catch (error) {
    console.error('Error getting destinations:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get destinations',
      statusCode: 500,
    });
  }
}

/**
 * GET /api/destinations/:id
 * Get a specific destination by ID
 */
export function getDestinationById(req: Request, res: Response): void {
  try {
    const { id } = req.params;
    const destination = destinationsData.find((d) => d.id === id);

    if (!destination) {
      res.status(404).json({
        error: 'Not Found',
        message: `Destination with id '${id}' not found`,
        statusCode: 404,
      });
      return;
    }

    res.json(destination);
  } catch (error) {
    console.error('Error getting destination:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get destination',
      statusCode: 500,
    });
  }
}
