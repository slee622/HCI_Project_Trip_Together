/**
 * Travel Search Routes
 * Endpoints for flight and hotel search via Flights Sky API
 */

import { Router, Request, Response } from 'express';
import {
  searchFlights as searchFlightsAPI,
  searchHotels as searchHotelsAPI,
  isFlightsSkyConfigured,
} from '../services/flightsSkyService';
import {
  searchFlights as searchFlightsMock,
  searchHotels as searchHotelsMock,
} from '../services/travelApiService';

const router = Router();

/**
 * GET /api/travel/status
 * Check if travel APIs are configured
 */
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    configured: isFlightsSkyConfigured(),
    provider: isFlightsSkyConfigured() ? 'flights-sky' : 'mock',
  });
});

/**
 * POST /api/travel/flights
 * Search for flights
 */
router.post('/flights', async (req: Request, res: Response) => {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      travelers = 1,
    } = req.body;

    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: origin, destination, departureDate',
        statusCode: 400,
      });
    }

    // Try Flights Sky API first if configured
    if (isFlightsSkyConfigured()) {
      try {
        const flights = await searchFlightsAPI(
          origin,
          destination,
          departureDate,
          returnDate,
          travelers
        );

        if (flights.length > 0) {
          return res.json({
            flights,
            source: 'flights-sky',
          });
        }
      } catch (apiError) {
        console.warn('Flights Sky API error, falling back to mock:', apiError);
      }
    }

    // Fall back to mock data
    const mockFlights = await searchFlightsMock(
      origin,
      destination,
      departureDate,
      returnDate || departureDate,
      travelers
    );

    return res.json({
      flights: mockFlights,
      source: 'mock',
    });
  } catch (error) {
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
router.post('/hotels', async (req: Request, res: Response) => {
  try {
    const {
      destination,
      checkInDate,
      checkOutDate,
      travelers = 2,
      rooms = 1,
    } = req.body;

    if (!destination || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: destination, checkInDate, checkOutDate',
        statusCode: 400,
      });
    }

    // Try Flights Sky API first if configured
    if (isFlightsSkyConfigured()) {
      try {
        const hotels = await searchHotelsAPI(
          destination,
          checkInDate,
          checkOutDate,
          travelers,
          rooms
        );

        if (hotels.length > 0) {
          return res.json({
            hotels,
            source: 'flights-sky',
          });
        }
      } catch (apiError) {
        console.warn('Flights Sky hotel API error, falling back to mock:', apiError);
      }
    }

    // Fall back to mock data
    const mockHotels = await searchHotelsMock(
      destination,
      checkInDate,
      checkOutDate,
      travelers
    );

    return res.json({
      hotels: mockHotels,
      source: 'mock',
    });
  } catch (error) {
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
router.post('/search', async (req: Request, res: Response) => {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      travelers = 1,
    } = req.body;

    if (!origin || !destination || !departureDate || !returnDate) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: origin, destination, departureDate, returnDate',
        statusCode: 400,
      });
    }

    // Try Flights Sky if configured
    if (isFlightsSkyConfigured()) {
      try {
        const [flights, hotels] = await Promise.all([
          searchFlightsAPI(origin, destination, departureDate, returnDate, travelers),
          searchHotelsAPI(destination, departureDate, returnDate, travelers, Math.ceil(travelers / 2)),
        ]);

        if (flights.length > 0 || hotels.length > 0) {
          return res.json({
            flights,
            hotels,
            source: 'flights-sky',
          });
        }
      } catch (apiError) {
        console.warn('Flights Sky combined search error, falling back to mock:', apiError);
      }
    }

    // Fall back to mock data
    const [mockFlights, mockHotels] = await Promise.all([
      searchFlightsMock(origin, destination, departureDate, returnDate, travelers),
      searchHotelsMock(destination, departureDate, returnDate, travelers),
    ]);

    return res.json({
      flights: mockFlights,
      hotels: mockHotels,
      source: 'mock',
    });
  } catch (error) {
    console.error('Travel search error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to search travel options',
      statusCode: 500,
    });
  }
});

export default router;
