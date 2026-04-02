"use strict";
/**
 * Recommendation Controller
 * Handles HTTP requests for destination recommendations
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendations = getRecommendations;
exports.getAllDestinations = getAllDestinations;
exports.getDestinationById = getDestinationById;
const recommendationService_1 = require("../services/recommendationService");
// Load destinations data
const destinations_json_1 = __importDefault(require("../../data/destinations.json"));
// Type assertion for imported JSON
const destinationsData = destinations_json_1.default;
/**
 * Validate that preferences are within valid range (0-10)
 */
function validatePreferences(preferences) {
    const fields = [
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
function getRecommendations(req, res) {
    try {
        const body = req.body;
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
        const recommendations = (0, recommendationService_1.rankDestinations)(destinationsData, body.preferences, undefined, // Use default weights
        limit);
        const response = {
            recommendations,
        };
        res.json(response);
    }
    catch (error) {
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
function getAllDestinations(_req, res) {
    try {
        res.json({
            destinations: destinationsData,
            count: destinationsData.length,
        });
    }
    catch (error) {
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
function getDestinationById(req, res) {
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
    }
    catch (error) {
        console.error('Error getting destination:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get destination',
            statusCode: 500,
        });
    }
}
