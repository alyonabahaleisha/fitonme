import winston from 'winston';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
        ? winston.format.json() // JSON format for production (better for Logflare/Supabase)
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple() // Simple text format for dev
        )
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'fitonme-api' },
    transports: [
        new winston.transports.Console()
    ],
});

export default logger;
