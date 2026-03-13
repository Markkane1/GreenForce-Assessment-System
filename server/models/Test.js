/**
 * Test model for teacher-authored assessments and delivery settings.
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const testSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2000,
    },
    timeLimitMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    passingScore: {
      type: Number,
      required: true,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    allowResume: {
      type: Boolean,
      default: false,
    },
    randomizeQuestions: {
      type: Boolean,
      default: false,
    },
    randomizeOptions: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export default models.Test || model('Test', testSchema);
