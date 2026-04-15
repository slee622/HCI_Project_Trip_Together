"use strict";
/**
 * Travel Search Routes
 * Endpoints for flight and hotel search via Flights Sky API
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const flightsSkyService_1 = require("../services/flightsSkyService");
const travelApiService_1 = require("../services/travelApiService");
const router = (0, express_1.Router)();
/**
 * GET /api/travel/status
 * Check if travel APIs are configured
 */
router.get('/status', (_req, res) => {
    res.json({
        configured: (0, flightsSkyService_1.isFlightsSkyConfigured)(),
        provider: (0, flightsSkyService_1.isFlightsSkyAvailable)() ? 'flights-sky' : 'mock',
        available: (0, flightsSkyService_1.isFlightsSkyAvailable)(),
    });
});
/**
 * POST /api/travel/flights
 * Search for flights
 */
router.post('/flights', async (req, res) => {
    try {
        const { origin, destination, departureDate, returnDate, travelers = 1, } = req.body;
        if (!origin || !destination || !departureDate) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Missing required fields: origin, destination, departureDate',
                statusCode: 400,
            });
        }
        // Try Flights Sky API first if configured
        if ((0, flightsSkyService_1.isFlightsSkyConfigured)()) {
            try {
                const flights = await (0, flightsSkyService_1.searchFlights)(origin, destination, departureDate, returnDate, travelers);
                if (flights.length > 0) {
                    return res.json({
                        flights,
                        source: 'flights-sky',
                    });
                }
            }
            catch (apiError) {
                console.warn('Flights Sky API error, falling back to mock:', apiError);
            }
        }
        // Fall back to mock data
        const mockFlights = await (0, travelApiService_1.searchFlights)(origin, destination, departureDate, returnDate || departureDate, travelers);
        return res.json({
            flights: mockFlights,
            source: 'mock',
        });
    }
    catch (error) {
        console.error('Flight search error:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to search flights',
            statusCode: 500,
        });
    }
});
/**
 * POST /api/travel/hotels
 * Search for hotels
 */
router.post('/hotels', async (req, res) => {
    try {
        const { destination, checkInDate, checkOutDate, travelers = 2, rooms = 1, } = req.body;
        if (!destination || !checkInDate || !checkOutDate) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Missing required fields: destination, checkInDate, checkOutDate',
                statusCode: 400,
            });
        }
        // Try Flights Sky API first if configured
        if ((0, flightsSkyService_1.isFlightsSkyConfigured)()) {
            try {
                const hotels = await (0, flightsSkyService_1.searchHotels)(destination, checkInDate, checkOutDate, travelers, rooms);
                if (hotels.length > 0) {
                    return res.json({
                        hotels,
                        source: 'flights-sky',
                    });
                }
            }
            catch (apiError) {
                console.warn('Flights Sky hotel API error, falling back to mock:', apiError);
            }
        }
        // Fall back to mock data
        const mockHotels = await (0, travelApiService_1.searchHotels)(destination, checkInDate, checkOutDate, travelers);
        return res.json({
            hotels: mockHotels,
            source: 'mock',
        });
    }
    catch (error) {
        console.error('Hotel search error:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to search hotels',
            statusCode: 500,
        });
    }
});
/**
 * POST /api/travel/search
 * Combined flight and hotel search
 */
router.post('/search', async (req, res) => {
    try {
        const { origin, destination, departureDate, returnDate, travelers = 1, } = req.body;
        if (!origin || !destination || !departureDate || !returnDate) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Missing required fields: origin, destination, departureDate, returnDate',
                statusCode: 400,
            });
        }
        // Try Flights Sky if configured
        if ((0, flightsSkyService_1.isFlightsSkyConfigured)()) {
            try {
                const [flights, hotels] = await Promise.all([
                    (0, flightsSkyService_1.searchFlights)(origin, destination, departureDate, returnDate, travelers),
                    (0, flightsSkyService_1.searchHotels)(destination, departureDate, returnDate, travelers, Math.ceil(travelers / 2)),
                ]);
                if (flights.length > 0 || hotels.length > 0) {
                    return res.json({
                        flights,
                        hotels,
                        source: 'flights-sky',
                    });
                }
            }
            catch (apiError) {
                console.warn('Flights Sky combined search error, falling back to mock:', apiError);
            }
        }
        // Fall back to mock data
        const [mockFlights, mockHotels] = await Promise.all([
            (0, travelApiService_1.searchFlights)(origin, destination, departureDate, returnDate, travelers),
            (0, travelApiService_1.searchHotels)(destination, departureDate, returnDate, travelers),
        ]);
        return res.json({
            flights: mockFlights,
            hotels: mockHotels,
            source: 'mock',
        });
    }
    catch (error) {
        console.error('Travel search error:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to search travel options',
            statusCode: 500,
        });
    }
});
exports.default = router;
