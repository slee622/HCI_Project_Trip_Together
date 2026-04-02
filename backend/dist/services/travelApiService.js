"use strict";
/**
 * Travel API Service
 * Wrapper for external flight and hotel APIs
 * Currently uses mock data, can be extended for real API integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchFlights = searchFlights;
exports.searchHotels = searchHotels;
exports.getDetailedTripEstimate = getDetailedTripEstimate;
// ============================================
// CONFIGURATION
// ============================================
// Set to true to use real API calls (when implemented)
const USE_LIVE_API = false;
// Mock airline names for realistic demo data
const MOCK_AIRLINES = [
    'United Airlines',
    'Delta Air Lines',
    'American Airlines',
    'Southwest Airlines',
    'JetBlue Airways',
    'Alaska Airlines',
];
// Mock hotel names by tier
const MOCK_HOTELS = {
    budget: [
        'Comfort Inn',
        'Holiday Inn Express',
        'Hampton Inn',
        'La Quinta Inn',
        'Best Western',
    ],
    midRange: [
        'Marriott',
        'Hilton Garden Inn',
        'Hyatt Place',
        'Sheraton',
        'DoubleTree',
    ],
    luxury: [
        'Ritz-Carlton',
        'Four Seasons',
        'W Hotel',
        'Waldorf Astoria',
        'St. Regis',
    ],
};
// ============================================
// MOCK DATA GENERATORS
// ============================================
/**
 * Generate mock flight search results
 */
function generateMockFlights(_origin, _destination, departureDate, returnDate, basePrice) {
    // Generate 3-5 flight options with varying prices
    const numResults = 3 + Math.floor(Math.random() * 3);
    const results = [];
    for (let i = 0; i < numResults; i++) {
        // Vary price by ±30%
        const priceVariation = 0.7 + Math.random() * 0.6;
        const price = Math.round(basePrice * priceVariation);
        const airline = MOCK_AIRLINES[Math.floor(Math.random() * MOCK_AIRLINES.length)];
        const stops = Math.random() < 0.3 ? 0 : Math.random() < 0.7 ? 1 : 2;
        results.push({
            price,
            airline,
            departureDate,
            returnDate,
            departureTime: `${6 + Math.floor(Math.random() * 12)}:${Math.random() < 0.5 ? '00' : '30'}`,
            returnTime: `${10 + Math.floor(Math.random() * 10)}:${Math.random() < 0.5 ? '00' : '30'}`,
            stops,
        });
    }
    // Sort by price
    return results.sort((a, b) => a.price - b.price);
}
/**
 * Generate mock hotel search results
 */
function generateMockHotels(baseRate) {
    const results = [];
    // Determine tier based on base rate
    let tier;
    if (baseRate < 150) {
        tier = 'budget';
    }
    else if (baseRate < 250) {
        tier = 'midRange';
    }
    else {
        tier = 'luxury';
    }
    // Get hotels from appropriate tier and one tier up/down
    const tierHotels = MOCK_HOTELS[tier];
    for (let i = 0; i < Math.min(5, tierHotels.length); i++) {
        // Vary rate by ±25%
        const rateVariation = 0.75 + Math.random() * 0.5;
        const nightlyRate = Math.round(baseRate * rateVariation);
        // Rating between 3.5 and 5.0
        const rating = Math.round((3.5 + Math.random() * 1.5) * 10) / 10;
        results.push({
            name: tierHotels[i],
            nightlyRate,
            rating,
            amenities: ['WiFi', 'Parking', 'Pool'].filter(() => Math.random() > 0.3),
        });
    }
    // Sort by nightly rate
    return results.sort((a, b) => a.nightlyRate - b.nightlyRate);
}
// ============================================
// PUBLIC API
// ============================================
/**
 * Search for flights
 * Returns mock data or real API results based on configuration
 */
async function searchFlights(origin, destination, departureDate, returnDate, _travelers, basePrice = 250) {
    if (USE_LIVE_API) {
        try {
            // TODO: Implement real API call here
            // Example: return await callFlightAPI(origin, destination, departureDate, returnDate, travelers);
            throw new Error('Live API not implemented');
        }
        catch (error) {
            console.warn('Live flight API failed, falling back to mock data:', error);
            // Fall back to mock data
        }
    }
    // Return mock data
    return generateMockFlights(origin, destination, departureDate, returnDate, basePrice);
}
/**
 * Search for hotels
 * Returns mock data or real API results based on configuration
 */
async function searchHotels(_destinationCity, _checkInDate, _checkOutDate, _travelers, baseRate = 150) {
    if (USE_LIVE_API) {
        try {
            // TODO: Implement real API call here
            // Example: return await callHotelAPI(destinationCity, checkInDate, checkOutDate, travelers);
            throw new Error('Live API not implemented');
        }
        catch (error) {
            console.warn('Live hotel API failed, falling back to mock data:', error);
            // Fall back to mock data
        }
    }
    // Return mock data
    return generateMockHotels(baseRate);
}
/**
 * Get combined trip estimate using flight and hotel searches
 * This can be used when more detailed pricing is needed
 */
async function getDetailedTripEstimate(origin, destinationCity, departureDate, returnDate, travelers, baseFlightPrice, baseHotelRate) {
    const [flights, hotels] = await Promise.all([
        searchFlights(origin, destinationCity, departureDate, returnDate, travelers, baseFlightPrice),
        searchHotels(destinationCity, departureDate, returnDate, travelers, baseHotelRate),
    ]);
    return { flights, hotels };
}
