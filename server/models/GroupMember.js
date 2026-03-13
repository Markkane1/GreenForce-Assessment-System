/**
 * GroupMember model for mapping student users to student groups.
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const groupMemberSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'StudentGroup',
      required: true,
      index: true,
    },
    studentId: {
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

groupMemberSchema.index({ groupId: 1, studentId: 1 }, { unique: true });

export default models.GroupMember || model('GroupMember', groupMemberSchema);
