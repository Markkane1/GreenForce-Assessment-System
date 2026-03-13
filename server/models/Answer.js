/**
 * Answer model for saved student responses and grading metadata per attempt question.
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const answerSchema = new Schema(
  {
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: 'TestAttempt',
      required: true,
      index: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true,
    },
    selectedOptionId: {
      type: Schema.Types.ObjectId,
      ref: 'MCQOption',
      default: null,
    },
    essayText: {
      type: String,
      trim: true,
      default: '',
      maxlength: 20000,
    },
    score: {
      type: Number,
      default: null,
      min: 0,
    },
    feedback: {
      type: String,
      trim: true,
      default: '',
      maxlength: 5000,
    },
    gradingStatus: {
      type: String,
      enum: ['auto_graded', 'pending', 'graded'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

answerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

export default models.Answer || model('Answer', answerSchema);
