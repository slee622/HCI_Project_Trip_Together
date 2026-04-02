"use strict";
/**
 * Recommendation Service
 * Scores and ranks destinations based on group preferences
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreDestination = scoreDestination;
exports.generateRecommendationReason = generateRecommendationReason;
exports.rankDestinations = rankDestinations;
const types_1 = require("../types");
// Map preference keys to destination score keys
const PREFERENCE_TO_DESTINATION_KEY = {
    temperature: 'temperatureScore',
    budget: 'budgetScore',
    urban: 'urbanScore',
    nature: 'natureScore',
    food: 'foodScore',
    nightlife: 'nightlifeScore',
    relaxation: 'relaxationScore',
};
/**
 * Calculate similarity score for a single dimension
 * Returns 0-10, where 10 means perfect match
 */
function calculateDimensionScore(destinationScore, preferenceScore) {
    return 10 - Math.abs(destinationScore - preferenceScore);
}
/**
 * Score a single destination against group preferences
 * Returns a score from 0-100
 */
function scoreDestination(destination, preferences, weights = types_1.DEFAULT_SCORING_WEIGHTS) {
    const dimensions = [
        'temperature',
        'budget',
        'urban',
        'nature',
        'food',
        'nightlife',
        'relaxation',
    ];
    let totalWeightedScore = 0;
    let totalWeight = 0;
    for (const dim of dimensions) {
        const destKey = PREFERENCE_TO_DESTINATION_KEY[dim];
        const destScore = destination[destKey];
        const prefScore = preferences[dim];
        const weight = weights[dim];
        const dimScore = calculateDimensionScore(destScore, prefScore);
        totalWeightedScore += dimScore * weight;
        totalWeight += weight;
    }
    // Normalize to 0-100 scale
    const maxPossibleScore = 10 * totalWeight;
    const normalizedScore = (totalWeightedScore / maxPossibleScore) * 100;
    return Math.round(normalizedScore);
}
/**
 * Get the match quality for each dimension
 * Returns array of { dimension, score, label } sorted by score descending
 */
function getDimensionMatches(destination, preferences) {
    const dimensions = [
        'temperature',
        'budget',
        'urban',
        'nature',
        'food',
        'nightlife',
        'relaxation',
    ];
    const matches = dimensions.map((dim) => {
        const destKey = PREFERENCE_TO_DESTINATION_KEY[dim];
        const destScore = destination[destKey];
        const prefScore = preferences[dim];
        const score = calculateDimensionScore(destScore, prefScore);
        // Generate descriptive label based on actual values
        let label;
        const labels = types_1.PREFERENCE_LABELS[dim];
        if (destScore >= 7) {
            label = labels.high.toLowerCase();
        }
        else if (destScore <= 3) {
            label = labels.low.toLowerCase();
        }
        else {
            label = `moderate ${labels.name.toLowerCase()}`;
        }
        return { dimension: dim, score, label };
    });
    return matches.sort((a, b) => b.score - a.score);
}
/**
 * Generate a human-readable reason for why a destination was recommended
 */
function generateRecommendationReason(destination, preferences) {
    const matches = getDimensionMatches(destination, preferences);
    // Get top 3 matching dimensions (score >= 8 means within 2 points)
    const topMatches = matches.filter((m) => m.score >= 8).slice(0, 3);
    if (topMatches.length === 0) {
        return `${destination.city} offers a balanced mix of experiences for your group.`;
    }
    // Build reason string from top matches
    const reasons = [];
    for (const match of topMatches) {
        switch (match.dimension) {
            case 'temperature':
                if (destination.temperatureScore >= 7) {
                    reasons.push('warm weather');
                }
                else if (destination.temperatureScore <= 3) {
                    reasons.push('cool climate');
                }
                else {
                    reasons.push('mild temperatures');
                }
                break;
            case 'budget':
                if (destination.budgetScore >= 7) {
                    reasons.push('upscale experiences');
                }
                else if (destination.budgetScore <= 3) {
                    reasons.push('budget-friendly options');
                }
                else {
                    reasons.push('moderate pricing');
                }
                break;
            case 'urban':
                if (destination.urbanScore >= 7) {
                    reasons.push('city atmosphere');
                }
                else if (destination.urbanScore <= 3) {
                    reasons.push('rural charm');
                }
                else {
                    reasons.push('suburban setting');
                }
                break;
            case 'nature':
                if (destination.natureScore >= 7) {
                    reasons.push('outdoor activities');
                }
                else if (destination.natureScore <= 3) {
                    reasons.push('indoor attractions');
                }
                break;
            case 'food':
                if (destination.foodScore >= 7) {
                    reasons.push('excellent food scene');
                }
                break;
            case 'nightlife':
                if (destination.nightlifeScore >= 7) {
                    reasons.push('vibrant nightlife');
                }
                else if (destination.nightlifeScore <= 3) {
                    reasons.push('quiet evenings');
                }
                break;
            case 'relaxation':
                if (destination.relaxationScore >= 7) {
                    reasons.push('relaxation opportunities');
                }
                else if (destination.relaxationScore <= 3) {
                    reasons.push('active adventures');
                }
                break;
        }
    }
    // Remove duplicates and empty strings
    const uniqueReasons = [...new Set(reasons.filter(Boolean))];
    if (uniqueReasons.length === 0) {
        return `${destination.city} matches your group's overall preferences well.`;
    }
    if (uniqueReasons.length === 1) {
        return `Great fit for ${uniqueReasons[0]}.`;
    }
    if (uniqueReasons.length === 2) {
        return `Great fit for ${uniqueReasons[0]} and ${uniqueReasons[1]}.`;
    }
    const lastReason = uniqueReasons.pop();
    return `Great fit for ${uniqueReasons.join(', ')}, and ${lastReason}.`;
}
/**
 * Rank all destinations by preference match
 * Returns sorted array with scores and reasons
 */
function rankDestinations(destinations, preferences, weights = types_1.DEFAULT_SCORING_WEIGHTS, limit) {
    const scored = destinations.map((dest) => ({
        id: dest.id,
        city: dest.city,
        state: dest.state,
        latitude: dest.latitude,
        longitude: dest.longitude,
        score: scoreDestination(dest, preferences, weights),
        reason: generateRecommendationReason(dest, preferences),
    }));
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    // Apply limit if specified
    if (limit && limit > 0) {
        return scored.slice(0, limit);
    }
    return scored;
}
