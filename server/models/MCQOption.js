/**
 * MCQOption model for answer choices attached to multiple-choice questions.
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const mcqOptionSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 500,
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export default models.MCQOption || model('MCQOption', mcqOptionSchema);
