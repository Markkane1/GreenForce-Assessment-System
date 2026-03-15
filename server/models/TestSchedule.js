/**
 * TestSchedule model for time-boxed test availability and assigned groups.
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const testScheduleSchema = new Schema(
  {
    testId: {
      type: Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
      index: true,
    },
    assignedGroups: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'StudentGroup',
        },
      ],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'assignedGroups must contain at least one student group.',
      },
    },
  },
  {
    timestamps: true,
  },
);

testScheduleSchema.path('endTime').validate(function validateEndTime(value) {
  return !this.startTime || value > this.startTime;
}, 'endTime must be later than startTime.');

testScheduleSchema.index({ assignedGroups: 1, endTime: 1, startTime: 1 });

export default models.TestSchedule || model('TestSchedule', testScheduleSchema);
