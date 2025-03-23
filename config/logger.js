const winston = require('winston');
const LokiTransport = require('winston-loki');
const { Kafka } = require('kafkajs');
const { metrics } = require('./metrics');

class Logger {
    constructor() {
        // Use shared metrics
        this.metrics = metrics;

        // Winston Logger with Loki Transport
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [
                // Console logging
                new winston.transports.Console({
                    format: winston.format.simple()
                }),
                // Loki logging
                new LokiTransport({
                    host: process.env.LOKI_HOST || 'http://loki:3100',
                    labels: { app: 'auth-service' },
                    json: true,
                    format: winston.format.json()
                })
            ]
        });

        // Kafka Setup
        this.kafka = new Kafka({
            clientId: 'auth-service',
            brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
            // Add legacy partitioner to remove warning
            createPartitioner: Kafka.defaultPartitioner
        });
        this.producer = this.kafka.producer();
        this.initKafka();
    }

    async initKafka() {
        try {
            await this.producer.connect();
        } catch (error) {
            console.error('Failed to connect to Kafka:', error);
        }
    }

    // Main logging method
    async log(level, message, data = {}) {
        try {
            // Log to Winston/Loki
            this.logger[level](message, data);

            // Update Prometheus metrics if needed
            if (data.metric && this.metrics[data.metric]) {
                if (data.value !== undefined) {
                    this.metrics[data.metric].observe(data.value);
                } else {
                    this.metrics[data.metric].labels(data.status || 'unknown').inc();
                }
            }

            // Send to Kafka
            try {
                await this.producer.send({
                    topic: 'auth-logs',
                    messages: [{
                        key: level,
                        value: JSON.stringify({
                            timestamp: new Date(),
                            level,
                            message,
                            ...data
                        })
                    }]
                });
            } catch (kafkaError) {
                console.error('Kafka logging error:', kafkaError);
            }
        } catch (error) {
            console.error('Logging error:', error);
        }
    }

    // Convenience methods
    async info(message, data = {}) {
        return this.log('info', message, data);
    }

    async error(message, data = {}) {
        return this.log('error', message, data);
    }

    async warn(message, data = {}) {
        return this.log('warn', message, data);
    }
}

// Create and export a single instance
const logger = new Logger();
module.exports = logger; 