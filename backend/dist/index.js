"use strict";
/**
 * Trip Together Backend Server
 * Express API for destination recommendations and trip cost estimation
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables first
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const recommendationRoutes_1 = __importDefault(require("./routes/recommendationRoutes"));
const tripEstimateRoutes_1 = __importDefault(require("./routes/tripEstimateRoutes"));
const travelRoutes_1 = __importDefault(require("./routes/travelRoutes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
// Request logging (simple)
app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});
// Routes
app.use('/api/recommendations', recommendationRoutes_1.default);
app.use('/api/trip-estimate', tripEstimateRoutes_1.default);
app.use('/api/travel', travelRoutes_1.default);
// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested endpoint does not exist',
        statusCode: 404,
    });
});
// Error handler
app.use((err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        statusCode: 500,
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Trip Together API server running on http://localhost:${PORT}`);
    console.log(`   - POST /api/recommendations - Get destination recommendations`);
    console.log(`   - POST /api/trip-estimate - Get trip cost estimate`);
    console.log(`   - POST /api/trip-estimate/batch - Get batch cost estimates`);
    console.log(`   - POST /api/travel/flights - Search flights (Flights Sky)`);
    console.log(`   - POST /api/travel/hotels - Search hotels (Flights Sky)`);
    console.log(`   - POST /api/travel/search - Combined flight + hotel search`);
    console.log(`   - GET /api/health - Health check`);
});
exports.default = app;
