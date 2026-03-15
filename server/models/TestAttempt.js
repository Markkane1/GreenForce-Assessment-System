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
    lastViolationAt: {
      type: Date,
      default: null,
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
    passed: {
      type: Boolean,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

testAttemptSchema.index(
  { scheduleId: 1, studentId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'in_progress' },
  },
);
testAttemptSchema.index({ scheduleId: 1, studentId: 1, status: 1 });
testAttemptSchema.index({ scheduleId: 1, status: 1, startedAt: 1 });
testAttemptSchema.index({ studentId: 1, status: 1, submittedAt: -1, createdAt: -1 });

export default models.TestAttempt || model('TestAttempt', testAttemptSchema);
