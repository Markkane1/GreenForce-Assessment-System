/**
 * ProctorLog model for storing anti-cheat and proctoring events during exam attempts.
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const proctorLogSchema = new Schema(
  {
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: 'TestAttempt',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

proctorLogSchema.index({ attemptId: 1, timestamp: -1 });

export default models.ProctorLog || model('ProctorLog', proctorLogSchema);
