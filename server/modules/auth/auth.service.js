import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import GroupMember from '../../models/GroupMember.js';
import InviteCode from '../../models/InviteCode.js';
import User from '../../models/User.js';
import { generateToken } from '../../utils/generateToken.js';
import { logger } from '../../utils/logger.js';
import { validateAndConsumeCode } from '../inviteCodes/inviteCodes.service.js';

const buildSafeUser = (user) => {
  const safeUser = user.toObject ? user.toObject() : { ...user };
  delete safeUser.password;
  return safeUser;
};

export const createUser = async (name, email, password, role, phone = null) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    const error = new Error('User with this email already exists.');
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : null,
    password: hashedPassword,
    role,
  });

  return buildSafeUser(user);
};

export const registerStudent = async (name, email, phone, password, rawInviteCode) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = String(rawInviteCode || '').trim().toUpperCase();
  const inviteCode = await InviteCode.findOne({
    code: normalizedCode,
    isUsed: false,
  }).populate('groupId', 'name');

  if (!inviteCode) {
    const error = new Error('Invalid or already used invite code');
    error.statusCode = 422;
    throw error;
  }

  if (inviteCode.expiresAt && inviteCode.expiresAt.getTime() < Date.now()) {
    const error = new Error('Invite code has expired');
    error.statusCode = 422;
    throw error;
  }

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    const error = new Error('User with this email already exists.');
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : null,
    password: hashedPassword,
    role: 'student',
  });

  try {
    const { groupId, groupName } = await validateAndConsumeCode(normalizedCode, newUser._id);

    await GroupMember.create({
      groupId,
      studentId: newUser._id,
    });

    const token = generateToken(newUser._id.toString(), newUser.role);

    return {
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
      },
      token,
      groupName,
    };
  } catch (error) {
    await User.findByIdAndDelete(newUser._id);
    await InviteCode.findOneAndUpdate(
      {
        code: normalizedCode,
        usedBy: newUser._id,
        isUsed: true,
      },
      {
        $set: {
          isUsed: false,
          usedBy: null,
          usedAt: null,
        },
      },
    );
    throw error;
  }
};

export const loginUser = async (email, password) => {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user._id.toString(), user.role);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
    },
    token,
  };
};

export const forgotPassword = async (email) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return { message: 'If that email exists, a reset link has been sent' };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  if (['development', 'test'].includes(process.env.NODE_ENV)) {
    logger.info(`Reset token for ${normalizedEmail}: ${rawToken}`);
  }

  return { message: 'If that email exists, a reset link has been sent' };
};

export const resetPassword = async (rawToken, newPassword) => {
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 422;
    throw error;
  }

  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    const error = new Error('Invalid or expired reset token.');
    error.statusCode = 422;
    throw error;
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  return { message: 'Password reset successful' };
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    const error = new Error('Current password is incorrect.');
    error.statusCode = 422;
    throw error;
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 422;
    throw error;
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  return { message: 'Password changed successfully' };
};

export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId).select('-password');

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return buildSafeUser(user);
};
