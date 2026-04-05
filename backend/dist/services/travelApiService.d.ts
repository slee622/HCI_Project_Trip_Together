/**
 * Travel API Service
 * Wrapper for external flight and hotel APIs
 * Currently uses mock data, can be extended for real API integration
 */
import { FlightSearchResult, HotelSearchResult } from '../types';
/**
 * Search for flights
 * Returns mock data or real API results based on configuration
 */
export declare function searchFlights(origin: string, destination: string, departureDate: string, returnDate: string, _travelers: number, basePrice?: number): Promise<FlightSearchResult[]>;
/**
 * Search for hotels
 * Returns mock data or real API results based on configuration
 */
export declare function searchHotels(_destinationCity: string, _checkInDate: string, _checkOutDate: string, _travelers: number, baseRate?: number): Promise<HotelSearchResult[]>;
/**
 * Get combined trip estimate using flight and hotel searches
 * This can be used when more detailed pricing is needed
 */
export declare function getDetailedTripEstimate(origin: string, destinationCity: string, departureDate: string, returnDate: string, travelers: number, baseFlightPrice: number, baseHotelRate: number): Promise<{
    flights: FlightSearchResult[];
    hotels: HotelSearchResult[];
}>;
