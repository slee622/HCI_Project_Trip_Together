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
        console.warn('[FlightsSky] API temporarily disabled due to rate limiting');
        return null;
    }
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: getHeaders(),
        });
        if (response.status === 429) {
            markRapidApiRateLimited();
            console.error('[FlightsSky] Rate limited (429) - check your RapidAPI plan or usage limits');
            return null;
        }
        return response;
    }
    catch (error) {
        console.error('[FlightsSky] Network error during fetch:', error);
        return null;
    }
}
// Check if API key is configured
function isFlightsSkyConfigured() {
    const configured = !!RAPIDAPI_KEY;
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.log(`[FlightsSky] API Configured: ${configured}, Key length: ${RAPIDAPI_KEY?.length || 0}`);
    }
    return configured;
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
function formatTimeInEastern(timeValue) {
    if (!timeValue) {
        return undefined;
    }
    const parsedTime = new Date(timeValue);
    if (Number.isNaN(parsedTime.getTime())) {
        return undefined;
    }
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/New_York',
    }).format(parsedTime);
}
// ============================================
// STATE TO MAJOR AIRPORTS MAPPING
// ============================================
// When a city doesn't have a direct airport code, fall back to the major airport in its state
const stateToMajorAirports = {
    // US States
    'AL': 'Birmingham-Shuttlesworth International',
    'AK': 'Ted Stevens Anchorage International',
    'AZ': 'Phoenix Sky Harbor International',
    'AR': 'Bill and Hillary Clinton National',
    'CA': 'Los Angeles International',
    'CO': 'Denver International',
    'CT': 'Bradley International',
    'DE': 'Philadelphia International',
    'FL': 'Miami International',
    'GA': 'Hartsfield-Jackson Atlanta International',
    'HI': 'Daniel K. Inouye International',
    'ID': 'Boise Air Terminal',
    'IL': 'Chicago O\'Hare International',
    'IN': 'Indianapolis International',
    'IA': 'Des Moines International',
    'KS': 'Kansas City International',
    'KY': 'Louisville International',
    'LA': 'Louis Armstrong New Orleans International',
    'ME': 'Portland International',
    'MD': 'Baltimore-Washington International',
    'MA': 'Boston Logan International',
    'MI': 'Detroit Metropolitan',
    'MN': 'Minneapolis-Saint Paul International',
    'MS': 'Jackson-Medgar Wiley Evers',
    'MO': 'Saint Louis Lambert International',
    'MT': 'Billings Logan International',
    'NE': 'Eppley Airfield',
    'NV': 'Harry Reid International',
    'NH': 'Manchester-Boston Regional',
    'NJ': 'Newark Liberty International',
    'NM': 'Sunport International',
    'NY': 'John F. Kennedy International',
    'NC': 'Charlotte Douglas International',
    'ND': 'Bismarck Theodore Roosevelt International',
    'OH': 'John Glenn Columbus International',
    'OK': 'Will Rogers World',
    'OR': 'Portland International',
    'PA': 'Philadelphia International',
    'RI': 'Theodore F. Green State',
    'SC': 'Charleston International',
    'SD': 'Joe Foss Field',
    'TN': 'Nashville International',
    'TX': 'Dallas-Fort Worth International',
    'UT': 'Salt Lake City International',
    'VT': 'Edward F. Knapp State',
    'VA': 'Richmond International',
    'WA': 'Seattle-Tacoma International',
    'WV': 'Yeager Airport',
    'WI': 'General Mitchell International',
    'WY': 'Jackson Hole Airport',
};
/**
 * Extract state abbreviation from location string
 * Handles formats like "City, ST" or "City, State Name"
 */
function extractStateFromLocation(location) {
    // Try to match "City, ST" format (e.g., "Miami, FL")
    const stateCodeMatch = location.match(/,\s*([A-Z]{2})(?:\s|$)/);
    if (stateCodeMatch) {
        return stateCodeMatch[1];
    }
    // Try to match full state names
    const stateNames = {
        'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
        'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
        'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
        'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
        'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
        'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
        'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
        'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
        'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
        'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
        'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
        'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
        'Wisconsin': 'WI', 'Wyoming': 'WY',
    };
    for (const [stateName, stateCode] of Object.entries(stateNames)) {
        if (location.includes(stateName)) {
            return stateCode;
        }
    }
    return null;
}
/**
 * Helper: Execute a single airport search query
 */
async function performAirportSearch(query) {
    if (isRapidApiTemporarilyDisabled()) {
        console.warn(`[FlightsSky] Skipping airport search for "${query}" - API rate limited`);
        return null;
    }
    try {
        const url = `https://${RAPIDAPI_HOST}/flights/auto-complete?query=${encodeURIComponent(query)}`;
        console.log(`[FlightsSky] Searching airport: "${query}"`);
        const response = await fetchFlightsSky(url);
        if (!response) {
            console.warn(`[FlightsSky] No response from airport search for "${query}"`);
            return null;
        }
        if (!response.ok) {
            if (response.status === 429) {
                console.error(`[FlightsSky] Rate limited while searching for "${query}"`);
                return null;
            }
            const errorText = await response.text();
            console.error(`[FlightsSky] Airport search failed for "${query}":`, response.status, errorText);
            throw new Error(`API request failed: ${response.status} ${errorText}`.trim());
        }
        const data = await response.json();
        // Find first airport result - prefer larger/primary airports
        if (data.data && Array.isArray(data.data)) {
            // First pass: look for primary airports (prefer those with names NOT containing "/" or secondary indicators)
            for (const item of data.data) {
                if (item.navigation?.entityType === 'AIRPORT' || item.skyId) {
                    const name = item.presentation?.title || item.name || '';
                    // Skip secondary/regional airports (those with "/" in the name like "Savannah / Hilton Head")
                    if (!name.includes('/') && !name.includes('Regional') && !name.includes('County')) {
                        return {
                            entityId: item.navigation?.entityId || item.entityId,
                            skyId: item.skyId || item.navigation?.localizedName,
                            name: name,
                            iata: item.presentation?.subtitle?.match(/\(([A-Z]{3})\)/)?.[1],
                            stateCode: item.presentation?.subtitle?.match(/,\s*([A-Z]{2})\b/)?.[1],
                            type: 'airport',
                        };
                    }
                }
            }
            // Second pass: if no primary airport found, accept any airport (including regional)
            for (const item of data.data) {
                if (item.navigation?.entityType === 'AIRPORT' || item.skyId) {
                    return {
                        entityId: item.navigation?.entityId || item.entityId,
                        skyId: item.skyId || item.navigation?.localizedName,
                        name: item.presentation?.title || item.name,
                        iata: item.presentation?.subtitle?.match(/\(([A-Z]{3})\)/)?.[1],
                        stateCode: item.presentation?.subtitle?.match(/,\s*([A-Z]{2})\b/)?.[1],
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
                    stateCode: item.presentation?.subtitle?.match(/,\s*([A-Z]{2})\b/)?.[1],
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
 * Falls back to major state airport if no nearby airport is found
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
    // Prefer the major airport for the state if we can infer one.
    if (initialResult && initialResult.type !== 'airport') {
        const stateCode = initialResult.stateCode || extractStateFromLocation(query);
        if (stateCode && stateToMajorAirports[stateCode]) {
            const majorAirportName = stateToMajorAirports[stateCode];
            console.log(`Found state ${stateCode}, searching for major airport: ${majorAirportName}`);
            const majorAirport = await performAirportSearch(majorAirportName);
            if (majorAirport && majorAirport.type === 'airport') {
                console.log(`Found major state airport: ${majorAirport.name} (${majorAirport.iata})`);
                return majorAirport;
            }
        }
        // Fall back to a nearby airport search if state-based lookup didn't work
        console.log(`No major state airport found for "${initialResult.name}", searching for nearby airports...`);
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
        // Validate dates - departure must be today or in the future, and return must follow departure
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to midnight
        const departure = new Date(departureDate);
        const returnTravelDate = returnDate ? new Date(returnDate) : null;
        if (departure < today) {
            console.warn(`Flight search rejected: departure date ${departureDate} is in the past`);
            return [];
        }
        if (returnTravelDate && returnTravelDate <= departure) {
            console.warn(`Flight search rejected: return date ${returnDate} is not after departure date ${departureDate}`);
            return [];
        }
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
            market: 'US',
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
            const departureTime = formatTimeInEastern(departure);
            const arrival = firstLeg.arrival || '';
            const arrivalTime = formatTimeInEastern(arrival);
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
        // Validate hotel dates before hitting the API
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        if (checkIn < today) {
            console.warn(`Hotel search rejected: check-in date ${checkInDate} is in the past`);
            return [];
        }
        if (checkOut <= checkIn) {
            console.warn(`Hotel search rejected: check-out date ${checkOutDate} is not after check-in date ${checkInDate}`);
            return [];
        }
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
            market: 'US',
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
        console.log('Hotel API response data:', JSON.stringify(data).substring(0, 500));
        // Calculate nights for nightly rate
        const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
        // Parse results
        const results = [];
        let hotels = data.data?.results?.hotels ||
            data.data?.hotels ||
            data.hotels ||
            data.data?.results?.groupedItineraries ||
            data.data ||
            [];
        // Ensure hotels is an array
        if (!Array.isArray(hotels)) {
            hotels = [];
        }
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
