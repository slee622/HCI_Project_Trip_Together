"use strict";
/**
 * Sky Scrapper API Service
 * Integrates with RapidAPI's Sky Scrapper for flight and hotel search
 * https://rapidapi.com/apiheya/api/sky-scrapper
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSkyScrappperConfigured = isSkyScrappperConfigured;
exports.searchLocation = searchLocation;
exports.searchFlights = searchFlights;
exports.searchHotels = searchHotels;
exports.searchFlightsAndHotels = searchFlightsAndHotels;
// ============================================
// CONFIGURATION
// ============================================
const RAPIDAPI_HOST = 'sky-scrapper.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
// Check if API key is configured
function isSkyScrappperConfigured() {
    return !!RAPIDAPI_KEY;
}
// Common headers for all requests
function getHeaders() {
    return {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
    };
}
/**
 * Search for airport/location entity ID by query (city name or airport code)
 */
async function searchLocation(query) {
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
        const data = await response.json();
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
    }
    catch (error) {
        console.error('Sky Scrapper location search failed:', error);
        return null;
    }
}
/**
 * Search for flights between two locations
 */
async function searchFlights(originCode, destinationCode, departureDate, returnDate, adults = 1) {
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
        const data = await response.json();
        // Parse results into our format
        const results = [];
        const itineraries = data.data?.itineraries || [];
        for (const itinerary of itineraries.slice(0, 10)) {
            const outboundLeg = itinerary.legs?.[0];
            const returnLeg = itinerary.legs?.[1];
            if (!outboundLeg)
                continue;
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
    }
    catch (error) {
        console.error('Sky Scrapper flight search failed:', error);
        return [];
    }
}
/**
 * Search for hotels in a destination
 */
async function searchHotels(destinationCity, checkInDate, checkOutDate, adults = 2, rooms = 1) {
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
        const data = await response.json();
        // Parse results into our format
        const results = [];
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
    }
    catch (error) {
        console.error('Sky Scrapper hotel search failed:', error);
        return [];
    }
}
/**
 * Search for both flights and hotels
 * Falls back to mock data if API fails
 */
async function searchFlightsAndHotels(originCode, destinationCity, departureDate, returnDate, travelers) {
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
