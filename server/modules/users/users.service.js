import bcrypt from 'bcryptjs';
import User from '../../models/User.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = ['admin', 'teacher', 'student'];

const buildSafeUser = (user) => {
  const safeUser = user.toObject ? user.toObject() : { ...user };
  delete safeUser.password;
  return safeUser;
};

export const createUser = async (data) => {
  if (!data.name?.trim()) {
    const error = new Error('Name is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!EMAIL_REGEX.test(data.email || '')) {
    const error = new Error('A valid email address is required.');
    error.statusCode = 400;
    throw error;
  }

  if (typeof data.password !== 'string' || data.password.length < 8) {
    const error = new Error('Password must be at least 8 characters long.');
    error.statusCode = 400;
    throw error;
  }

  if (data.role !== undefined && !ALLOWED_ROLES.includes(data.role)) {
    const error = new Error('Role must be admin, teacher, or student.');
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await User.findOne({ email: data.email.toLowerCase() });

  if (existingUser) {
    const error = new Error('User with this email already exists.');
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: hashedPassword,
    role: data.role || 'student',
  });

  return buildSafeUser(user);
};

export const getAllUsers = async (filters = {}) => {
  const query = {};

  if (filters.role !== undefined) {
    if (typeof filters.role !== 'string' || !ALLOWED_ROLES.includes(filters.role)) {
      const error = new Error('Role filter must be admin, teacher, or student.');
      error.statusCode = 400;
      throw error;
    }

    query.role = filters.role;
  }

  return User.find(query).select('-password').sort({ createdAt: -1 });
};

export const getUserById = async (id) => {
  const user = await User.findById(id).select('-password');

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

export const updateUser = async (id, data) => {
  const updates = {};
  const user = await User.findById(id);

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  if (data.name !== undefined) {
    updates.name = data.name;
  }

  if (data.email !== undefined) {
    if (!EMAIL_REGEX.test(data.email || '')) {
      const error = new Error('A valid email address is required.');
      error.statusCode = 400;
      throw error;
    }

    const normalizedEmail = data.email.toLowerCase();
    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: id },
    }).select('_id');

    if (existingUser) {
      const error = new Error('User with this email already exists.');
      error.statusCode = 409;
      throw error;
    }

    updates.email = normalizedEmail;
  }

  if (data.role !== undefined) {
    if (!ALLOWED_ROLES.includes(data.role)) {
      const error = new Error('Role must be admin, teacher, or student.');
      error.statusCode = 400;
      throw error;
    }

    updates.role = data.role;
  }

  if (data.password !== undefined) {
    if (typeof data.password !== 'string' || data.password.length < 8) {
      const error = new Error('Password must be at least 8 characters long.');
      error.statusCode = 422;
      throw error;
    }

    updates.password = await bcrypt.hash(data.password, 12);
  }

  Object.assign(user, updates);
  await user.save();

  return buildSafeUser(user);
};

export const deleteUser = async (id) => {
  const user = await User.findByIdAndDelete(id);

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return {
    success: true,
    message: 'User deleted successfully.',
  };
};
