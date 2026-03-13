/**
 * TestAttempt model for tracking deterministic exam sessions and submission state.
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const testAttemptSchema = new Schema(
  {
    testId: {
      type: Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
      index: true,
    },
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'TestSchedule',
      required: true,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'force_submitted', 'expired'],
      default: 'in_progress',
      index: true,
    },
    violationsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    questionOrder: {
      type: Schema.Types.Mixed,
      default: [],
    },
    optionOrder: {
      type: Schema.Types.Mixed,
      default: {},
    },
    score: {
      type: Number,
      default: null,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

testAttemptSchema.index({ scheduleId: 1, studentId: 1, status: 1 });

export default models.TestAttempt || model('TestAttempt', testAttemptSchema);
