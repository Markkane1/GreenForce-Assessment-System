import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    const error = new Error('MONGO_URI is required');
    error.statusCode = 500;
    throw error;
  }

  const connection = await mongoose.connect(process.env.MONGO_URI);
  logger.info(`MongoDB connected: ${connection.connection.host}`);
  return connection;
};
