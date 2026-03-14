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
      min: 0,
    },
    questionsToServe: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

sectionSchema.path('questionsToServe').validate(function validateQuestionsToServe(value) {
  if (this instanceof mongoose.Query) {
    const update = this.getUpdate() || {};
    const nextQuestionPoolSize = update.questionPoolSize ?? update.$set?.questionPoolSize;

    if (typeof nextQuestionPoolSize === 'number') {
      return typeof value === 'number' && value >= 0 && value <= nextQuestionPoolSize;
    }

    return true;
  }

  return typeof value === 'number' && value >= 0 && value <= this.questionPoolSize;
}, 'questionsToServe cannot exceed questionPoolSize.');

sectionSchema.index({ testId: 1, order: 1 }, { unique: true });

export default models.Section || model('Section', sectionSchema);
