/**
 * Cost Estimation Service
 * Calculates trip cost estimates using mock data or external APIs
 */
import { Destination, TripEstimate } from '../types';
/**
 * Calculate number of nights between two dates
 */
export declare function calculateNights(departureDate: string, returnDate: string): number;
/**
 * Calculate rooms needed based on traveler count
 */
export declare function calculateRoomsNeeded(travelers: number): number;
/**
 * Estimate flight cost per person (mock calculation)
 */
export declare function estimateFlightPerPerson(destinationId: string, _origin: string): number;
/**
 * Estimate hotel cost per night based on destination budget score
 * Higher budget score = more expensive destination
 */
export declare function estimateHotelPerNight(budgetScore: number): number;
/**
 * Calculate trip cost estimate with low/mid/high ranges
 */
export declare function calculateTripEstimate(destination: Destination, origin: string, travelers: number, departureDate: string, returnDate: string): TripEstimate;
/**
 * Get trip estimate for a destination by ID
 * This is the main entry point for the cost estimation service
 */
export declare function getTripEstimate(destination: Destination, origin: string, travelers: number, departureDate: string, returnDate: string): TripEstimate;
