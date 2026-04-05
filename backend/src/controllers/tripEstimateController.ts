/**
 * Trip Estimate Controller
 * Handles HTTP requests for trip cost estimates
 */

import { Request, Response } from 'express';
import { getTripEstimate } from '../services/costEstimationService';
import { Destination, TripEstimateRequest, TripEstimateResponse } from '../types';

// Load destinations data
import destinations from '../../data/destinations.json';

// Type assertion for imported JSON
const destinationsData: Destination[] = destinations as Destination[];

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * POST /api/trip-estimate
 * Get cost estimate for a trip to a destination
 */
export function getTripEstimateHandler(req: Request, res: Response): void {
  try {
    const body = req.body as TripEstimateRequest;

    // Validate required fields
    if (!body.origin) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'origin is required',
        statusCode: 400,
      });
      return;
    }

    if (!body.destinationId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'destinationId is required',
        statusCode: 400,
      });
      return;
    }

    if (!body.travelers || body.travelers < 1) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'travelers must be at least 1',
        statusCode: 400,
      });
      return;
    }

    if (!body.departureDate || !isValidDate(body.departureDate)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'departureDate must be a valid date (YYYY-MM-DD)',
        statusCode: 400,
      });
      return;
    }

    if (!body.returnDate || !isValidDate(body.returnDate)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'returnDate must be a valid date (YYYY-MM-DD)',
        statusCode: 400,
      });
      return;
    }

    // Validate return date is after departure date
    if (new Date(body.returnDate) <= new Date(body.departureDate)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'returnDate must be after departureDate',
        statusCode: 400,
      });
      return;
    }

    // Find destination
    const destination = destinationsData.find((d) => d.id === body.destinationId);
    if (!destination) {
      res.status(404).json({
        error: 'Not Found',
        message: `Destination with id '${body.destinationId}' not found`,
        statusCode: 404,
      });
      return;
    }

    // TODO: When auth/groups are integrated, verify user has access to this trip
    // const groupId = body.groupId;
    // await verifyGroupAccess(groupId, req.user.id);

    // Get trip estimate
    const estimate = getTripEstimate(
      destination,
      body.origin,
      body.travelers,
      body.departureDate,
      body.returnDate
    );

    const response: TripEstimateResponse = estimate;
    res.json(response);
  } catch (error) {
    console.error('Error getting trip estimate:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get trip estimate',
      statusCode: 500,
    });
  }
}

/**
 * POST /api/trip-estimate/batch
 * Get cost estimates for multiple destinations at once
 * Useful for getting prices for all recommended destinations
 */
export function getBatchTripEstimates(req: Request, res: Response): void {
  try {
    const {
      origin,
      destinationIds,
      travelers,
      departureDate,
      returnDate,
    } = req.body;

    // Validate required fields
    if (!origin || !destinationIds || !travelers || !departureDate || !returnDate) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'origin, destinationIds, travelers, departureDate, and returnDate are required',
        statusCode: 400,
      });
      return;
    }

    if (!Array.isArray(destinationIds) || destinationIds.length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'destinationIds must be a non-empty array',
        statusCode: 400,
      });
      return;
    }

    if (!isValidDate(departureDate) || !isValidDate(returnDate)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'dates must be valid (YYYY-MM-DD)',
        statusCode: 400,
      });
      return;
    }

    // Get estimates for each destination
    const estimates: TripEstimateResponse[] = [];
    const notFound: string[] = [];

    for (const destId of destinationIds) {
      const destination = destinationsData.find((d) => d.id === destId);
      if (!destination) {
        notFound.push(destId);
        continue;
      }

      const estimate = getTripEstimate(
        destination,
        origin,
        travelers,
        departureDate,
        returnDate
      );
      estimates.push(estimate);
    }

    res.json({
      estimates,
      notFound: notFound.length > 0 ? notFound : undefined,
    });
  } catch (error) {
    console.error('Error getting batch trip estimates:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get trip estimates',
      statusCode: 500,
    });
  }
}
