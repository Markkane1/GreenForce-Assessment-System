import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { connectDB } from './config/db.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

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
