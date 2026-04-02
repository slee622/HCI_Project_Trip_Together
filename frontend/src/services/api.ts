/**
 * API Service
 * Handles communication with the Trip Together backend
 */

import {
  RecommendationRequest,
  RecommendationResponse,
  TripEstimateRequest,
  TripEstimate,
  GroupPreferences,
  RecommendationWithEstimate,
} from '../types';

// API base URL - configure based on environment
const API_BASE_URL = process.env.REACT_NATIVE_API_URL || 'http://localhost:3001';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: 'An unknown error occurred',
    }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get destination recommendations based on preferences
 */
export async function getRecommendations(
  preferences: GroupPreferences,
  limit: number = 10
): Promise<RecommendationResponse> {
  const request: RecommendationRequest = {
    preferences,
    limit,
  };

  return fetchApi<RecommendationResponse>('/api/recommendations', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Get trip cost estimate for a single destination
 */
export async function getTripEstimate(
  request: TripEstimateRequest
): Promise<TripEstimate> {
  return fetchApi<TripEstimate>('/api/trip-estimate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Get trip cost estimates for multiple destinations
 */
export async function getBatchTripEstimates(
  origin: string,
  destinationIds: string[],
  travelers: number,
  departureDate: string,
  returnDate: string
): Promise<{ estimates: TripEstimate[]; notFound?: string[] }> {
  return fetchApi('/api/trip-estimate/batch', {
    method: 'POST',
    body: JSON.stringify({
      origin,
      destinationIds,
      travelers,
      departureDate,
      returnDate,
    }),
  });
}

/**
 * Get recommendations with cost estimates combined
 * This is the main API call for the MVP demo flow
 */
export async function getRecommendationsWithEstimates(
  preferences: GroupPreferences,
  tripDetails: {
    origin: string;
    travelers: number;
    departureDate: string;
    returnDate: string;
  },
  limit: number = 10
): Promise<RecommendationWithEstimate[]> {
  // Get recommendations first
  const { recommendations } = await getRecommendations(preferences, limit);

  // Then get batch estimates for all recommendations
  const destinationIds = recommendations.map((r) => r.id);
  const { estimates } = await getBatchTripEstimates(
    tripDetails.origin,
    destinationIds,
    tripDetails.travelers,
    tripDetails.departureDate,
    tripDetails.returnDate
  );

  // Create a map for quick lookup
  const estimateMap = new Map(estimates.map((e) => [e.destinationId, e]));

  // Combine recommendations with estimates
  return recommendations.map((rec) => ({
    ...rec,
    estimate: estimateMap.get(rec.id),
  }));
}

/**
 * Health check for the API
 */
export async function checkApiHealth(): Promise<{
  status: string;
  timestamp: string;
}> {
  return fetchApi('/api/health');
}
