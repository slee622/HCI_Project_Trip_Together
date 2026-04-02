/**
 * Shared types for Trip Together frontend
 * Mirrors backend types for type safety
 */

// ============================================
// GROUP PREFERENCES TYPES
// ============================================

export interface GroupPreferences {
  temperature: number;
  budget: number;
  urban: number;
  nature: number;
  food: number;
  nightlife: number;
  relaxation: number;
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
  score: number;
  reason: string;
}

export interface RecommendationRequest {
  preferences: GroupPreferences;
  limit?: number;
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
  origin: string;
  destinationId: string;
  travelers: number;
  departureDate: string;
  returnDate: string;
}

// ============================================
// COMBINED DISPLAY TYPES
// ============================================

export interface RecommendationWithEstimate extends RecommendationResult {
  estimate?: TripEstimate;
}

// ============================================
// PREFERENCE METADATA
// ============================================

export type PreferenceDimension = 
  | 'temperature'
  | 'budget'
  | 'urban'
  | 'nature'
  | 'food'
  | 'nightlife'
  | 'relaxation';

export interface PreferenceConfig {
  key: PreferenceDimension;
  name: string;
  lowLabel: string;
  highLabel: string;
  icon: string;
}

export const PREFERENCE_CONFIGS: PreferenceConfig[] = [
  { key: 'temperature', name: 'Temperature', lowLabel: 'Cool', highLabel: 'Warm', icon: '🌡️' },
  { key: 'budget', name: 'Budget', lowLabel: 'Budget', highLabel: 'Splurge', icon: '💰' },
  { key: 'urban', name: 'Setting', lowLabel: 'Rural', highLabel: 'City', icon: '🏙️' },
  { key: 'nature', name: 'Nature', lowLabel: 'Indoor', highLabel: 'Outdoors', icon: '🌲' },
  { key: 'food', name: 'Food', lowLabel: 'Basic', highLabel: 'Foodie', icon: '🍽️' },
  { key: 'nightlife', name: 'Nightlife', lowLabel: 'Quiet', highLabel: 'Party', icon: '🌙' },
  { key: 'relaxation', name: 'Pace', lowLabel: 'Active', highLabel: 'Relaxing', icon: '🧘' },
];

// Default preferences (middle values)
export const DEFAULT_PREFERENCES: GroupPreferences = {
  temperature: 5,
  budget: 5,
  urban: 5,
  nature: 5,
  food: 5,
  nightlife: 5,
  relaxation: 5,
};
