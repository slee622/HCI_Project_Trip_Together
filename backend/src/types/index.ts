/**
 * Shared types for Trip Together travel planning app
 * These interfaces define the contracts between frontend and backend
 */

// ============================================
// DESTINATION TYPES
// ============================================

export interface Destination {
  id: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  temperatureScore: number; // 0-10, higher = warmer
  budgetScore: number;      // 0-10, higher = more expensive
  urbanScore: number;       // 0-10, higher = more urban
  natureScore: number;      // 0-10, higher = more nature-focused
  foodScore: number;        // 0-10, higher = better food scene
  nightlifeScore: number;   // 0-10, higher = better nightlife
  relaxationScore: number;  // 0-10, higher = more relaxing
  shortDescription: string;
  imageUrl?: string | null;
}

// ============================================
// GROUP PREFERENCES TYPES
// ============================================

/**
 * GroupPreferences represents the combined travel preferences for a group
 * TODO: Teammates will integrate this with their group/session system
 * For now, this is passed directly from the frontend
 */
export interface GroupPreferences {
  temperature: number;  // 0-10, higher = prefer warmer
  budget: number;       // 0-10, higher = prefer splurge
  urban: number;        // 0-10, higher = prefer city
  nature: number;       // 0-10, higher = prefer nature
  food: number;         // 0-10, higher = prioritize food
  nightlife: number;    // 0-10, higher = prioritize nightlife
  relaxation: number;   // 0-10, higher = prioritize relaxation
}

// ============================================
// RECOMMENDATION TYPES
// ============================================

export interface RecommendationResult {
  id: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  score: number;        // 0-100, final recommendation score
  reason: string;       // Human-readable explanation
}

export interface RecommendationRequest {
  preferences: GroupPreferences;
  limit?: number;       // Number of recommendations to return (default: 10)
  // TODO: Add groupId when team integrates auth/groups
  // groupId?: string;
}

export interface RecommendationResponse {
  recommendations: RecommendationResult[];
}

// ============================================
// COST ESTIMATION TYPES
// ============================================

export interface TripEstimateBreakdown {
  flightPerPersonEstimate: number;
  hotelPerNightEstimate: number;
  nights: number;
  roomsNeeded: number;
}

export interface TripEstimate {
  destinationId: string;
  low: number;
  mid: number;
  high: number;
  breakdown: TripEstimateBreakdown;
}

export interface TripEstimateRequest {
  origin: string;           // Airport code (e.g., "PHL")
  destinationId: string;    // Destination ID from destinations.json
  travelers: number;        // Number of travelers
  departureDate: string;    // ISO date string (YYYY-MM-DD)
  returnDate: string;       // ISO date string (YYYY-MM-DD)
  // TODO: Add groupId when team integrates auth/groups
  // groupId?: string;
}

export interface TripEstimateResponse extends TripEstimate {}

// ============================================
// TRAVEL API TYPES (for external integrations)
// ============================================

export interface FlightSearchResult {
  price: number;
  airline: string;
  departureDate: string;
  returnDate: string;
  departureTime?: string;
  returnTime?: string;
  stops?: number;
}

export interface HotelSearchResult {
  name: string;
  nightlyRate: number;
  rating: number;
  amenities?: string[];
}

// ============================================
// API ERROR TYPES
// ============================================

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// ============================================
// SCORING CONFIG TYPES
// ============================================

export interface ScoringWeights {
  temperature: number;
  budget: number;
  urban: number;
  nature: number;
  food: number;
  nightlife: number;
  relaxation: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  temperature: 1.0,
  budget: 1.0,
  urban: 1.0,
  nature: 1.0,
  food: 0.8,
  nightlife: 0.7,
  relaxation: 0.8,
};

// ============================================
// PREFERENCE DIMENSION METADATA
// ============================================

export type PreferenceDimension = 
  | 'temperature'
  | 'budget'
  | 'urban'
  | 'nature'
  | 'food'
  | 'nightlife'
  | 'relaxation';

export const PREFERENCE_LABELS: Record<PreferenceDimension, { low: string; high: string; name: string }> = {
  temperature: { low: 'Cool', high: 'Warm', name: 'Temperature' },
  budget: { low: 'Budget', high: 'Splurge', name: 'Budget' },
  urban: { low: 'Rural', high: 'City', name: 'Urban' },
  nature: { low: 'Indoor', high: 'Nature', name: 'Nature' },
  food: { low: 'Basic', high: 'Foodie', name: 'Food' },
  nightlife: { low: 'Quiet', high: 'Nightlife', name: 'Nightlife' },
  relaxation: { low: 'Active', high: 'Relaxing', name: 'Relaxation' },
};
