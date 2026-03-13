/**
 * Question model for MCQ and essay items that belong to a test section.
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const questionSchema = new Schema(
  {
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['mcq', 'essay'],
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    points: {
      type: Number,
      required: true,
      min: 1,
    },
    maxWordCount: {
      type: Number,
      min: 1,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

questionSchema.path('maxWordCount').validate(function validateMaxWordCount(value) {
  if (this.type === 'essay') {
    return Number.isInteger(value) && value > 0;
  }

  return value === null || value === undefined || (Number.isInteger(value) && value > 0);
}, 'maxWordCount must be a positive integer for essay questions.');

export default models.Question || model('Question', questionSchema);
