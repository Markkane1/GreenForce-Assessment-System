import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 5000;
const PLACEHOLDER_JWT_SECRET = 'replace_with_a_long_random_secret';

const validateEnvironment = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET === PLACEHOLDER_JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be replaced with a strong production secret before startup.');
    }

    if (!process.env.CLIENT_URL) {
      throw new Error('CLIENT_URL is required in production.');
    }
  }
};

const startServer = async () => {
  validateEnvironment();

  await connectDB();

  const server = http.createServer(app);

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use. Stop the existing process or change PORT.`);
      process.exit(1);
      return;
    }

    logger.error('HTTP server failed', error);
    process.exit(1);
  });

  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
