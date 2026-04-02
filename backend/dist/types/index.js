"use strict";
/**
 * Shared types for Trip Together travel planning app
 * These interfaces define the contracts between frontend and backend
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PREFERENCE_LABELS = exports.DEFAULT_SCORING_WEIGHTS = void 0;
exports.DEFAULT_SCORING_WEIGHTS = {
    temperature: 1.0,
    budget: 1.0,
    urban: 1.0,
    nature: 1.0,
    food: 0.8,
    nightlife: 0.7,
    relaxation: 0.8,
};
exports.PREFERENCE_LABELS = {
    temperature: { low: 'Cool', high: 'Warm', name: 'Temperature' },
    budget: { low: 'Budget', high: 'Splurge', name: 'Budget' },
    urban: { low: 'Rural', high: 'City', name: 'Urban' },
    nature: { low: 'Indoor', high: 'Nature', name: 'Nature' },
    food: { low: 'Basic', high: 'Foodie', name: 'Food' },
    nightlife: { low: 'Quiet', high: 'Nightlife', name: 'Nightlife' },
    relaxation: { low: 'Active', high: 'Relaxing', name: 'Relaxation' },
};
