/**
 * Recommendation Service
 * Scores and ranks destinations based on group preferences
 */
import { Destination, GroupPreferences, RecommendationResult, ScoringWeights } from '../types';
/**
 * Score a single destination against group preferences
 * Returns a score from 0-100
 */
export declare function scoreDestination(destination: Destination, preferences: GroupPreferences, weights?: ScoringWeights): number;
/**
 * Generate a human-readable reason for why a destination was recommended
 */
export declare function generateRecommendationReason(destination: Destination, preferences: GroupPreferences): string;
/**
 * Rank all destinations by preference match
 * Returns sorted array with scores and reasons
 */
export declare function rankDestinations(destinations: Destination[], preferences: GroupPreferences, weights?: ScoringWeights, limit?: number): RecommendationResult[];
