const prometheus = require('prom-client');

// Create a Registry instance
const register = new prometheus.Registry();

// Add a default label which is added to all metrics
prometheus.collectDefaultMetrics({ register });

// Define metrics
const metrics = {
    loginAttempts: new prometheus.Counter({
        name: 'login_attempts_total',
        help: 'Total number of login attempts',
        labelNames: ['status'],
        registers: [register]
    }),
    requestDuration: new prometheus.Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        registers: [register]
    })
};

module.exports = { metrics, register }; 