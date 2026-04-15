/**
 * Flights Sky API Service
 * Integrates with RapidAPI's Flights Sky for flight search
 * https://rapidapi.com/apiheya/api/flights-sky
 */
import { FlightSearchResult } from '../types';
export declare function isFlightsSkyConfigured(): boolean;
export declare function isFlightsSkyAvailable(): boolean;
interface FlightsSkyEntity {
    entityId: string;
    skyId: string;
    name: string;
    iata?: string;
    type: string;
}
/**
 * Search for airport/location entity ID by query (city name or airport code)
 * Falls back to nearby airports if initial search returns a city, not an airport
 */
export declare function searchAirport(query: string): Promise<FlightsSkyEntity | null>;
/**
 * Search for flights between two locations
 */
export declare function searchFlights(originCode: string, destinationCode: string, departureDate: string, returnDate?: string, travelers?: number): Promise<FlightSearchResult[]>;
import { HotelSearchResult } from '../types';
/**
 * Search for hotels in a city
 */
export declare function searchHotels(destination: string, checkInDate: string, checkOutDate: string, travelers?: number, rooms?: number): Promise<HotelSearchResult[]>;
export {};
