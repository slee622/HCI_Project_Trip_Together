"use strict";
/**
 * Cost Estimation Service
 * Calculates trip cost estimates using mock data or external APIs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateNights = calculateNights;
exports.calculateRoomsNeeded = calculateRoomsNeeded;
exports.estimateFlightPerPerson = estimateFlightPerPerson;
exports.estimateHotelPerNight = estimateHotelPerNight;
exports.calculateTripEstimate = calculateTripEstimate;
exports.getTripEstimate = getTripEstimate;
// ============================================
// MOCK DATA CONFIGURATION
// ============================================
// Base flight costs by distance tier (from a generic US origin)
const FLIGHT_BASE_COST = 150;
const FLIGHT_DISTANCE_TIERS = {
    // West Coast destinations from East Coast
    'los-angeles-ca': 100,
    'san-francisco-ca': 100,
    'san-diego-ca': 100,
    'seattle-wa': 100,
    'portland-or': 100,
    'napa-valley-ca': 100,
    'carmel-ca': 100,
    'bend-or': 100,
    // Hawaii (expensive flights)
    'honolulu-hi': 250,
    'maui-hi': 275,
    // Mountain destinations
    'denver-co': 50,
    'aspen-co': 75,
    'jackson-hole-wy': 100,
    'salt-lake-city-ut': 75,
    'park-city-ut': 75,
    'bozeman-mt': 100,
    'moab-ut': 100,
    'sedona-az': 75,
    // Southwest
    'phoenix-az': 60,
    'scottsdale-az': 60,
    'tucson-az': 60,
    'las-vegas-nv': 50,
    'santa-fe-nm': 75,
    // Texas
    'austin-tx': 40,
    'dallas-tx': 40,
    'houston-tx': 40,
    'san-antonio-tx': 50,
    // Southeast
    'miami-fl': 50,
    'orlando-fl': 40,
    'tampa-fl': 40,
    'key-west-fl': 75,
    'atlanta-ga': 30,
    'savannah-ga': 40,
    'charleston-sc': 40,
    'nashville-tn': 30,
    'new-orleans-la': 40,
    'asheville-nc': 40,
    // Northeast/Mid-Atlantic (shorter flights)
    'new-york-ny': 25,
    'boston-ma': 25,
    'washington-dc': 20,
    'philadelphia-pa': 15,
    'pittsburgh-pa': 25,
    // Midwest
    'chicago-il': 30,
    'minneapolis-mn': 40,
    'milwaukee-wi': 35,
    'st-louis-mo': 30,
    // New England
    'portland-me': 35,
    'bar-harbor-me': 50,
};
// Demand factor for popular destinations
const DESTINATION_DEMAND_FACTOR = {
    'new-york-ny': 50,
    'los-angeles-ca': 30,
    'miami-fl': 40,
    'las-vegas-nv': 30,
    'honolulu-hi': 50,
    'maui-hi': 60,
    'san-francisco-ca': 25,
    'new-orleans-la': 25,
    'aspen-co': 75,
    'key-west-fl': 35,
};
/**
 * Calculate number of nights between two dates
 */
function calculateNights(departureDate, returnDate) {
    const departure = new Date(departureDate);
    const returnD = new Date(returnDate);
    const diffTime = returnD.getTime() - departure.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
}
/**
 * Calculate rooms needed based on traveler count
 */
function calculateRoomsNeeded(travelers) {
    return Math.ceil(travelers / 2);
}
/**
 * Estimate flight cost per person (mock calculation)
 */
function estimateFlightPerPerson(destinationId, _origin // Currently unused, but available for future distance calculation
) {
    const baseCost = FLIGHT_BASE_COST;
    const distanceFactor = FLIGHT_DISTANCE_TIERS[destinationId] || 50;
    const demandFactor = DESTINATION_DEMAND_FACTOR[destinationId] || 0;
    return baseCost + distanceFactor + demandFactor;
}
/**
 * Estimate hotel cost per night based on destination budget score
 * Higher budget score = more expensive destination
 */
function estimateHotelPerNight(budgetScore) {
    // Base: $80, scales up with budget score
    // budgetScore 1 = $105, budgetScore 10 = $330
    return 80 + budgetScore * 25;
}
/**
 * Calculate trip cost estimate with low/mid/high ranges
 */
function calculateTripEstimate(destination, origin, travelers, departureDate, returnDate) {
    const nights = calculateNights(departureDate, returnDate);
    const roomsNeeded = calculateRoomsNeeded(travelers);
    const flightPerPerson = estimateFlightPerPerson(destination.id, origin);
    const hotelPerNight = estimateHotelPerNight(destination.budgetScore);
    // Base costs
    const totalFlightCost = flightPerPerson * travelers;
    const totalHotelCost = hotelPerNight * nights * roomsNeeded;
    const baseCost = totalFlightCost + totalHotelCost;
    // Calculate ranges with buffers for food, activities, etc.
    const low = Math.round(baseCost * 1.1); // 10% buffer
    const mid = Math.round(baseCost * 1.35); // 35% buffer
    const high = Math.round(baseCost * 1.6); // 60% buffer
    const breakdown = {
        flightPerPersonEstimate: flightPerPerson,
        hotelPerNightEstimate: hotelPerNight,
        nights,
        roomsNeeded,
    };
    return {
        destinationId: destination.id,
        low,
        mid,
        high,
        breakdown,
    };
}
/**
 * Get trip estimate for a destination by ID
 * This is the main entry point for the cost estimation service
 */
function getTripEstimate(destination, origin, travelers, departureDate, returnDate) {
    // TODO: When external API is integrated, check if live mode is enabled
    // and call travelApiService instead
    return calculateTripEstimate(destination, origin, travelers, departureDate, returnDate);
}
