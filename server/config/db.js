import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export const connectDB = async () => {
  const connection = await mongoose.connect(process.env.MONGO_URI);
  logger.info(`MongoDB connected: ${connection.connection.host}`);
  return connection;
};
