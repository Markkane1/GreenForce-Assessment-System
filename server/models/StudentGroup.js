/**
 * StudentGroup model for organizing students into assignable cohorts.
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const studentGroupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

studentGroupSchema.index({ name: 1, createdBy: 1 }, { unique: true });

export default models.StudentGroup || model('StudentGroup', studentGroupSchema);
