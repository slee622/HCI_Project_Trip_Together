"use strict";
/**
 * Flights Sky API Service
 * Integrates with RapidAPI's Flights Sky for flight search
 * https://rapidapi.com/apiheya/api/flights-sky
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFlightsSkyConfigured = isFlightsSkyConfigured;
exports.isFlightsSkyAvailable = isFlightsSkyAvailable;
exports.searchAirport = searchAirport;
exports.searchFlights = searchFlights;
exports.searchHotels = searchHotels;
// ============================================
// CONFIGURATION
// ============================================
const RAPIDAPI_HOST = 'flights-sky.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000;
let rapidApiDisabledUntil = 0;
function isRapidApiTemporarilyDisabled() {
    return Date.now() < rapidApiDisabledUntil;
}
function markRapidApiRateLimited() {
    rapidApiDisabledUntil = Date.now() + RAPIDAPI_RATE_LIMIT_COOLDOWN_MS;
    console.warn(`Flights Sky API rate limited; using mock data until ${new Date(rapidApiDisabledUntil).toISOString()}`);
}
async function fetchFlightsSky(url) {
    if (isRapidApiTemporarilyDisabled()) {
        return null;
    }
    const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
    });
    if (response.status === 429) {
        markRapidApiRateLimited();
        return null;
    }
    return response;
}
// Check if API key is configured
function isFlightsSkyConfigured() {
    return !!RAPIDAPI_KEY;
}
function isFlightsSkyAvailable() {
    return isFlightsSkyConfigured() && !isRapidApiTemporarilyDisabled();
}
// Common headers for all requests
function getHeaders() {
    return {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST,
        'Content-Type': 'application/json',
    };
}
/**
 * Helper: Execute a single airport search query
 */
async function performAirportSearch(query) {
    if (isRapidApiTemporarilyDisabled()) {
        return null;
    }
    try {
        const url = `https://${RAPIDAPI_HOST}/flights/auto-complete?query=${encodeURIComponent(query)}`;
        const response = await fetchFlightsSky(url);
        if (!response) {
            return null;
        }
        if (!response.ok) {
            if (response.status === 429) {
                return null;
            }
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${errorText}`.trim());
        }
        const data = await response.json();
        // Find first airport result
        if (data.data && Array.isArray(data.data)) {
            for (const item of data.data) {
                if (item.navigation?.entityType === 'AIRPORT' || item.skyId) {
                    return {
                        entityId: item.navigation?.entityId || item.entityId,
                        skyId: item.skyId || item.navigation?.localizedName,
                        name: item.presentation?.title || item.name,
                        iata: item.presentation?.subtitle?.match(/\(([A-Z]{3})\)/)?.[1],
                        type: 'airport',
                    };
                }
            }
            // If no airport found, return first result (city, town, etc.)
            if (data.data.length > 0) {
                const item = data.data[0];
                return {
                    entityId: item.navigation?.entityId || item.entityId || '',
                    skyId: item.skyId || '',
                    name: item.presentation?.title || item.name || query,
                    type: item.navigation?.entityType || 'city',
                };
            }
        }
        return null;
    }
    catch (error) {
        if (!(error instanceof Error && error.message.includes('429'))) {
            console.error('Flights Sky airport search failed:', error);
        }
        return null;
    }
}
/**
 * Search for airport/location entity ID by query (city name or airport code)
 * Falls back to nearby airports if initial search returns a city, not an airport
 */
async function searchAirport(query) {
    if (!isFlightsSkyConfigured()) {
        console.warn('Flights Sky API key not configured');
        return null;
    }
    if (isRapidApiTemporarilyDisabled()) {
        return null;
    }
    // Initial search with the user's query
    const initialResult = await performAirportSearch(query);
    // If we got an airport directly, return it
    if (initialResult && initialResult.type === 'airport') {
        return initialResult;
    }
    // If we got a non-airport result (city, town, etc.), try to find a nearby airport
    // by searching for "[city name] airport"
    if (initialResult && initialResult.type !== 'airport') {
        console.log(`Initial search returned non-airport "${initialResult.name}" (${initialResult.type}), searching for nearby airports...`);
        const nearbyAirportQuery = `${initialResult.name} airport`;
        const nearbyAirport = await performAirportSearch(nearbyAirportQuery);
        if (nearbyAirport && nearbyAirport.type === 'airport') {
            console.log(`Found nearby airport: ${nearbyAirport.name} (${nearbyAirport.iata})`);
            return nearbyAirport;
        }
    }
    // Return the best result we found (could be city if no airport exists)
    return initialResult;
}
// ============================================
// FLIGHT SEARCH
// ============================================
/**
 * Search for flights between two locations
 */
async function searchFlights(originCode, destinationCode, departureDate, returnDate, travelers = 1) {
    if (!isFlightsSkyConfigured()) {
        console.warn('Flights Sky API key not configured');
        return [];
    }
    if (isRapidApiTemporarilyDisabled()) {
        return [];
    }
    try {
        // First, get entity IDs for origin and destination
        const [originEntity, destEntity] = await Promise.all([
            searchAirport(originCode),
            searchAirport(destinationCode),
        ]);
        if (!originEntity || !destEntity) {
            console.warn('Could not find airport entities for:', { originCode, destinationCode });
            return [];
        }
        console.log('Found airports:', {
            origin: originEntity.name,
            originSkyId: originEntity.skyId,
            originEntityId: originEntity.entityId,
            dest: destEntity.name,
            destSkyId: destEntity.skyId,
            destEntityId: destEntity.entityId,
        });
        // Build search URL
        const params = new URLSearchParams({
            originSkyId: originEntity.skyId,
            destinationSkyId: destEntity.skyId,
            originEntityId: originEntity.entityId,
            destinationEntityId: destEntity.entityId,
            date: departureDate,
            adults: travelers.toString(),
            currency: 'USD',
            market: 'en-US',
            countryCode: 'US',
        });
        if (returnDate) {
            params.set('returnDate', returnDate);
        }
        const url = `https://${RAPIDAPI_HOST}/flights/search-one-way?${params.toString()}`;
        console.log('Searching flights:', url.replace(RAPIDAPI_KEY, '***'));
        const response = await fetchFlightsSky(url);
        if (!response) {
            return [];
        }
        if (!response.ok) {
            if (response.status === 429) {
                return [];
            }
            const errorText = await response.text();
            console.error('Flight search failed:', response.status, errorText);
            throw new Error(`Flight search failed: ${response.status}`);
        }
        const data = await response.json();
        // Parse results
        const results = [];
        const itineraries = data.data?.itineraries || [];
        for (const itinerary of itineraries.slice(0, 10)) {
            const price = itinerary.price?.raw || itinerary.price?.formatted?.replace(/[^0-9.]/g, '');
            const legs = itinerary.legs || [];
            const firstLeg = legs[0] || {};
            // Get carrier info
            const carrier = firstLeg.carriers?.marketing?.[0] || {};
            const airline = carrier.name || 'Unknown Airline';
            // Get timing
            const departure = firstLeg.departure || '';
            const departureTime = departure ? new Date(departure).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : undefined;
            const arrival = firstLeg.arrival || '';
            const arrivalTime = arrival ? new Date(arrival).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : undefined;
            // Get stops
            const stops = (firstLeg.stopCount ?? firstLeg.segments?.length - 1) || 0;
            if (price) {
                results.push({
                    price: Math.round(parseFloat(price.toString())),
                    airline,
                    departureDate,
                    returnDate: returnDate || departureDate,
                    departureTime,
                    returnTime: arrivalTime,
                    stops,
                });
            }
        }
        return results.sort((a, b) => a.price - b.price);
    }
    catch (error) {
        if (!(error instanceof Error && error.message.includes('429'))) {
            console.error('Flights Sky search failed:', error);
        }
        return [];
    }
}
/**
 * Search for hotel location entity by city name
 */
async function searchHotelLocation(query) {
    if (!isFlightsSkyConfigured()) {
        return null;
    }
    if (isRapidApiTemporarilyDisabled()) {
        return null;
    }
    try {
        const url = `https://${RAPIDAPI_HOST}/hotels/auto-complete?query=${encodeURIComponent(query)}`;
        const response = await fetchFlightsSky(url);
        if (!response) {
            return null;
        }
        if (!response.ok) {
            if (response.status === 429) {
                return null;
            }
            const errorText = await response.text();
            throw new Error(`Hotel location search failed: ${response.status} ${errorText}`.trim());
        }
        const data = await response.json();
        // Find first city/destination result
        if (data.data && Array.isArray(data.data)) {
            for (const item of data.data) {
                if (item.entityId) {
                    return {
                        entityId: item.entityId,
                        name: item.name || item.presentation?.title || query,
                    };
                }
            }
        }
        return null;
    }
    catch (error) {
        if (!(error instanceof Error && error.message.includes('429'))) {
            console.error('Hotel location search failed:', error);
        }
        return null;
    }
}
/**
 * Search for hotels in a city
 */
async function searchHotels(destination, checkInDate, checkOutDate, travelers = 2, rooms = 1) {
    if (!isFlightsSkyConfigured()) {
        console.warn('Flights Sky API key not configured');
        return [];
    }
    if (isRapidApiTemporarilyDisabled()) {
        return [];
    }
    try {
        // Get entity ID for destination
        const locationEntity = await searchHotelLocation(destination);
        if (!locationEntity) {
            console.warn('Could not find hotel location for:', destination);
            return [];
        }
        console.log('Found hotel location:', locationEntity);
        // Search for hotels
        const params = new URLSearchParams({
            entityId: locationEntity.entityId,
            checkin: checkInDate,
            checkout: checkOutDate,
            adults: travelers.toString(),
            rooms: rooms.toString(),
            currency: 'USD',
            market: 'en-US',
            countryCode: 'US',
        });
        const url = `https://${RAPIDAPI_HOST}/hotels/search?${params.toString()}`;
        console.log('Searching hotels:', url.replace(RAPIDAPI_KEY, '***'));
        const response = await fetchFlightsSky(url);
        if (!response) {
            return [];
        }
        if (!response.ok) {
            if (response.status === 429) {
                return [];
            }
            const errorText = await response.text();
            console.error('Hotel search failed:', response.status, errorText);
            throw new Error(`Hotel search failed: ${response.status}`);
        }
        const data = await response.json();
        // Calculate nights for nightly rate
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
        // Parse results
        const results = [];
        const hotels = data.data?.hotels || data.data || [];
        for (const hotel of hotels.slice(0, 10)) {
            const totalPrice = hotel.price?.raw || hotel.rawPrice || hotel.price || 0;
            const nightlyRate = Math.round(parseFloat(totalPrice.toString()) / nights);
            if (nightlyRate > 0) {
                results.push({
                    name: hotel.name || hotel.hotelName || 'Unknown Hotel',
                    nightlyRate,
                    rating: hotel.rating?.value || hotel.starRating || hotel.stars || 3.5,
                    amenities: hotel.amenities || hotel.facilities?.slice(0, 5) || ['WiFi'],
                });
            }
        }
        return results.sort((a, b) => a.nightlyRate - b.nightlyRate);
    }
    catch (error) {
        if (!(error instanceof Error && error.message.includes('429'))) {
            console.error('Flights Sky hotel search failed:', error);
        }
        return [];
    }
}
