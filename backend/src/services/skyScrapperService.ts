/**
 * Sky Scrapper API Service
 * Integrates with RapidAPI's Sky Scrapper for flight and hotel search
 * https://rapidapi.com/apiheya/api/sky-scrapper
 */

import { FlightSearchResult, HotelSearchResult } from '../types';

// ============================================
// CONFIGURATION
// ============================================

const RAPIDAPI_HOST = 'sky-scrapper.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

// Check if API key is configured
export function isSkyScrappperConfigured(): boolean {
  return !!RAPIDAPI_KEY;
}

// Common headers for all requests
function getHeaders() {
  return {
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': RAPIDAPI_HOST,
  };
}

// ============================================
// AIRPORT/LOCATION SEARCH
// ============================================

interface SkyScrapperEntity {
  entityId: string;
  name: string;
  iata?: string;
  type: string;
}

/**
 * Search for airport/location entity ID by query (city name or airport code)
 */
export async function searchLocation(query: string): Promise<SkyScrapperEntity | null> {
  if (!isSkyScrappperConfigured()) {
    console.warn('Sky Scrapper API key not configured');
    return null;
  }

  try {
    const url = `https://${RAPIDAPI_HOST}/api/v1/flights/searchAirport?query=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data: any = await response.json();
    
    // Return first matching result
    if (data.data && data.data.length > 0) {
      const entity = data.data[0];
      return {
        entityId: entity.entityId || entity.skyId,
        name: entity.presentation?.suggestionTitle || entity.name,
        iata: entity.iata,
        type: entity.type || 'airport',
      };
    }

    return null;
  } catch (error) {
    console.error('Sky Scrapper location search failed:', error);
    return null;
  }
}

// ============================================
// FLIGHT SEARCH
// ============================================

interface SkyScrapperFlightLeg {
  departure: string;
  arrival: string;
  durationInMinutes: number;
  stopCount: number;
  carriers: { name: string }[];
}

interface SkyScrapperFlight {
  id: string;
  price: { formatted: string; raw: number };
  legs: SkyScrapperFlightLeg[];
}

/**
 * Search for flights between two locations
 */
export async function searchFlights(
  originCode: string,
  destinationCode: string,
  departureDate: string,
  returnDate?: string,
  adults: number = 1
): Promise<FlightSearchResult[]> {
  if (!isSkyScrappperConfigured()) {
    console.warn('Sky Scrapper API key not configured, returning empty results');
    return [];
  }

  try {
    // First, get entity IDs for origin and destination
    const [originEntity, destEntity] = await Promise.all([
      searchLocation(originCode),
      searchLocation(destinationCode),
    ]);

    if (!originEntity || !destEntity) {
      console.warn('Could not find airport entities for:', { originCode, destinationCode });
      return [];
    }

    // Build search URL
    const params = new URLSearchParams({
      originSkyId: originEntity.entityId,
      destinationSkyId: destEntity.entityId,
      originEntityId: originEntity.entityId,
      destinationEntityId: destEntity.entityId,
      date: departureDate,
      adults: adults.toString(),
      currency: 'USD',
      market: 'en-US',
      countryCode: 'US',
    });

    if (returnDate) {
      params.append('returnDate', returnDate);
    }

    const url = `https://${RAPIDAPI_HOST}/api/v2/flights/searchFlights?${params.toString()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Flight search failed: ${response.status}`);
    }

    const data: any = await response.json();

    // Parse results into our format
    const results: FlightSearchResult[] = [];
    const itineraries = data.data?.itineraries || [];

    for (const itinerary of itineraries.slice(0, 10)) {
      const outboundLeg = itinerary.legs?.[0];
      const returnLeg = itinerary.legs?.[1];

      if (!outboundLeg) continue;

      const airline = outboundLeg.carriers?.marketing?.[0]?.name || 
                      outboundLeg.carriers?.[0]?.name || 
                      'Unknown Airline';

      results.push({
        price: itinerary.price?.raw || 0,
        airline,
        departureDate,
        returnDate: returnDate || departureDate,
        departureTime: outboundLeg.departure ? 
          new Date(outboundLeg.departure).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 
          undefined,
        returnTime: returnLeg?.departure ? 
          new Date(returnLeg.departure).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 
          undefined,
        stops: outboundLeg.stopCount || 0,
      });
    }

    return results.sort((a, b) => a.price - b.price);
  } catch (error) {
    console.error('Sky Scrapper flight search failed:', error);
    return [];
  }
}

// ============================================
// HOTEL SEARCH
// ============================================

interface SkyScrapperHotel {
  id: string;
  name: string;
  price: { raw: number; formatted: string };
  rating?: { value: number };
  stars?: number;
}

/**
 * Search for hotels in a destination
 */
export async function searchHotels(
  destinationCity: string,
  checkInDate: string,
  checkOutDate: string,
  adults: number = 2,
  rooms: number = 1
): Promise<HotelSearchResult[]> {
  if (!isSkyScrappperConfigured()) {
    console.warn('Sky Scrapper API key not configured, returning empty results');
    return [];
  }

  try {
    // Get entity ID for destination
    const destEntity = await searchLocation(destinationCity);

    if (!destEntity) {
      console.warn('Could not find location entity for:', destinationCity);
      return [];
    }

    const params = new URLSearchParams({
      entityId: destEntity.entityId,
      checkin: checkInDate,
      checkout: checkOutDate,
      adults: adults.toString(),
      rooms: rooms.toString(),
      currency: 'USD',
      market: 'en-US',
      countryCode: 'US',
    });

    const url = `https://${RAPIDAPI_HOST}/api/v1/hotels/searchHotels?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Hotel search failed: ${response.status}`);
    }

    const data: any = await response.json();

    // Parse results into our format
    const results: HotelSearchResult[] = [];
    const hotels = data.data?.hotels || data.data || [];

    for (const hotel of hotels.slice(0, 10)) {
      // Calculate nightly rate
      const totalPrice = hotel.price?.raw || hotel.rawPrice || 0;
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
      const nightlyRate = Math.round(totalPrice / nights);

      results.push({
        name: hotel.name || 'Unknown Hotel',
        nightlyRate,
        rating: hotel.rating?.value || hotel.stars || 3.5,
        amenities: hotel.amenities || ['WiFi'],
      });
    }

    return results.sort((a, b) => a.nightlyRate - b.nightlyRate);
  } catch (error) {
    console.error('Sky Scrapper hotel search failed:', error);
    return [];
  }
}

// ============================================
// COMBINED SEARCH
// ============================================

export interface TravelSearchResults {
  flights: FlightSearchResult[];
  hotels: HotelSearchResult[];
  source: 'sky-scrapper' | 'mock';
}

/**
 * Search for both flights and hotels
 * Falls back to mock data if API fails
 */
export async function searchFlightsAndHotels(
  originCode: string,
  destinationCity: string,
  departureDate: string,
  returnDate: string,
  travelers: number
): Promise<TravelSearchResults> {
  const [flights, hotels] = await Promise.all([
    searchFlights(originCode, destinationCity, departureDate, returnDate, travelers),
    searchHotels(destinationCity, departureDate, returnDate, travelers, Math.ceil(travelers / 2)),
  ]);

  // If we got results, return them
  if (flights.length > 0 || hotels.length > 0) {
    return { flights, hotels, source: 'sky-scrapper' };
  }

  // No results - could be API issue or no availability
  return { flights: [], hotels: [], source: 'sky-scrapper' };
}
