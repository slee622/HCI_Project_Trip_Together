/**
 * Shared types for Trip Together travel planning app
 * These interfaces define the contracts between frontend and backend
 */
export interface Destination {
    id: string;
    city: string;
    state: string;
    latitude: number;
    longitude: number;
    temperatureScore: number;
    budgetScore: number;
    urbanScore: number;
    natureScore: number;
    foodScore: number;
    nightlifeScore: number;
    relaxationScore: number;
    shortDescription: string;
    imageUrl?: string | null;
}
/**
 * UserPreferences represents the 5 slider dimensions in the UI
 * These map to destination scores for recommendation matching
 */
export interface UserPreferences {
    adventure: number;
    budget: number;
    setting: number;
    weather: number;
    focus: number;
}
/**
 * GroupPreferences - the format sent to the recommendation API
 * Derived from UserPreferences with proper mappings
 */
export interface GroupPreferences {
    temperature: number;
    budget: number;
    urban: number;
    nature: number;
    food: number;
    nightlife: number;
    relaxation: number;
}
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
export interface TripEstimateResponse extends TripEstimate {
}
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
export interface ApiError {
    error: string;
    message: string;
    statusCode: number;
}
export interface ScoringWeights {
    temperature: number;
    budget: number;
    urban: number;
    nature: number;
    food: number;
    nightlife: number;
    relaxation: number;
}
export declare const DEFAULT_SCORING_WEIGHTS: ScoringWeights;
export type PreferenceDimension = 'temperature' | 'budget' | 'urban' | 'nature' | 'food' | 'nightlife' | 'relaxation';
export declare const PREFERENCE_LABELS: Record<PreferenceDimension, {
    low: string;
    high: string;
    name: string;
}>;
