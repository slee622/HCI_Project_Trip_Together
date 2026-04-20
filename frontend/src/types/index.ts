/**
 * Shared types for Trip Together frontend
 * Mirrors backend types for type safety
 */

// ============================================
// USER PREFERENCES (5 slider dimensions)
// ============================================

export type SliderDimension = 'adventure' | 'budget' | 'setting' | 'weather' | 'focus';

export interface UserPreferences {
  adventure: number; // 0=Relaxing, 10=Adventurous
  budget: number;    // 0=Budget, 10=Splurge
  setting: number;   // 0=City, 10=Nature
  weather: number;   // 0=Warm, 10=Cool
  focus: number;     // 0=Food-focused, 10=Experience
}

export interface SliderConfig {
  key: SliderDimension;
  lowLabel: string;
  highLabel: string;
}

export const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'adventure', lowLabel: 'Relaxing', highLabel: 'Adventurous' },
  { key: 'budget', lowLabel: 'Budget', highLabel: 'Splurge' },
  { key: 'setting', lowLabel: 'City', highLabel: 'Nature' },
  { key: 'weather', lowLabel: 'Warm weather', highLabel: 'Cool weather' },
  { key: 'focus', lowLabel: 'Food-focused', highLabel: 'Experience' },
];

export const DEFAULT_PREFERENCES: UserPreferences = {
  adventure: 5,
  budget: 5,
  setting: 5,
  weather: 5,
  focus: 5,
};

// ============================================
// GROUP PREFERENCES (for API compatibility)
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

/**
 * Convert user slider preferences to API group preferences
 * Handles the mapping/inversion between UI sliders and backend scoring
 */
export function userPrefsToGroupPrefs(prefs: UserPreferences): GroupPreferences {
  return {
    // weather: 0=Warm, 10=Cool → temperature: 0=Cool, 10=Warm (invert)
    temperature: 10 - prefs.weather,
    // budget: direct mapping
    budget: prefs.budget,
    // setting: 0=City, 10=Nature → urban is inverse, nature is direct
    urban: 10 - prefs.setting,
    nature: prefs.setting,
    // focus: 0=Food, 10=Experience → food is inverse
    food: 10 - prefs.focus,
    // adventure: 0=Relaxing, 10=Adventurous → nightlife=direct, relaxation=inverse
    nightlife: prefs.adventure,
    relaxation: 10 - prefs.adventure,
  };
}

// ============================================
// COMPARE TYPES
// ============================================

export interface CompareDestination {
  id: string;
  city: string;
  state: string;
  category: string;
  priceRange: string;
  latitude?: number;
  longitude?: number;
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

export interface CustomMapMarker {
  id: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}
