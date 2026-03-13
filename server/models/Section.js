/**
 * Section model for grouping questions and defining pool selection rules within a test.
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const sectionSchema = new Schema(
  {
    testId: {
      type: Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 150,
    },
    order: {
      type: Number,
      required: true,
      min: 1,
    },
    questionPoolSize: {
      type: Number,
      required: true,
      min: 1,
    },
    questionsToServe: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  },
);

sectionSchema.path('questionsToServe').validate(function validateQuestionsToServe(value) {
  return typeof value === 'number' && value <= this.questionPoolSize;
}, 'questionsToServe cannot exceed questionPoolSize.');

sectionSchema.index({ testId: 1, order: 1 }, { unique: true });

export default models.Section || model('Section', sectionSchema);
