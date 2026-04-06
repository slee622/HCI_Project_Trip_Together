/**
 * Sky Scrapper API Service
 * Integrates with RapidAPI's Sky Scrapper for flight and hotel search
 * https://rapidapi.com/apiheya/api/sky-scrapper
 */
import { FlightSearchResult, HotelSearchResult } from '../types';
export declare function isSkyScrappperConfigured(): boolean;
interface SkyScrapperEntity {
    entityId: string;
    name: string;
    iata?: string;
    type: string;
}
/**
 * Search for airport/location entity ID by query (city name or airport code)
 */
export declare function searchLocation(query: string): Promise<SkyScrapperEntity | null>;
/**
 * Search for flights between two locations
 */
export declare function searchFlights(originCode: string, destinationCode: string, departureDate: string, returnDate?: string, adults?: number): Promise<FlightSearchResult[]>;
/**
 * Search for hotels in a destination
 */
export declare function searchHotels(destinationCity: string, checkInDate: string, checkOutDate: string, adults?: number, rooms?: number): Promise<HotelSearchResult[]>;
export interface TravelSearchResults {
    flights: FlightSearchResult[];
    hotels: HotelSearchResult[];
    source: 'sky-scrapper' | 'mock';
}
/**
 * Search for both flights and hotels
 * Falls back to mock data if API fails
 */
export declare function searchFlightsAndHotels(originCode: string, destinationCity: string, departureDate: string, returnDate: string, travelers: number): Promise<TravelSearchResults>;
export {};
