import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const parseIntegerEnv = (value, fallback) => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const ensureGroupMemberIndexes = async (connection) => {
  const collection = connection.connection.db.collection('groupmembers');
  const indexes = await collection.indexes();
  const indexNames = new Set(indexes.map((index) => index.name));

  if (indexNames.has('groupId_1_userId_1')) {
    await collection.dropIndex('groupId_1_userId_1');
    logger.info('Dropped legacy groupmembers index: groupId_1_userId_1');
  }

  if (!indexNames.has('groupId_1_studentId_1')) {
    await collection.createIndex({ groupId: 1, studentId: 1 }, { unique: true, background: true, name: 'groupId_1_studentId_1' });
    logger.info('Created groupmembers index: groupId_1_studentId_1');
  }

  if (!indexNames.has('studentId_1_groupId_1')) {
    await collection.createIndex({ studentId: 1, groupId: 1 }, { background: true, name: 'studentId_1_groupId_1' });
    logger.info('Created groupmembers index: studentId_1_groupId_1');
  }
};

export const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    const error = new Error('MONGO_URI is required');
    error.statusCode = 500;
    throw error;
  }

  const maxPoolSize = parseIntegerEnv(process.env.MONGO_MAX_POOL_SIZE, 100);
  const minPoolSize = Math.min(parseIntegerEnv(process.env.MONGO_MIN_POOL_SIZE, 10), maxPoolSize);
  const maxIdleTimeMS = parseIntegerEnv(process.env.MONGO_MAX_IDLE_TIME_MS, 60000);
  const serverSelectionTimeoutMS = parseIntegerEnv(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 5000);
  const socketTimeoutMS = parseIntegerEnv(process.env.MONGO_SOCKET_TIMEOUT_MS, 45000);

  mongoose.set('autoIndex', process.env.NODE_ENV !== 'production');

  const connection = await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize,
    minPoolSize,
    maxIdleTimeMS,
    serverSelectionTimeoutMS,
    socketTimeoutMS,
  });
  await ensureGroupMemberIndexes(connection);
  logger.info(`MongoDB connected: ${connection.connection.host}`);
  return connection;
};
