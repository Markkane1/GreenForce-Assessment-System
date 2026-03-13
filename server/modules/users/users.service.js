import User from '../../models/User.js';

export const getAllUsers = async (filters = {}) => {
  const query = {};

  if (filters.role) {
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

  if (data.name !== undefined) {
    updates.name = data.name;
  }

  if (data.email !== undefined) {
    updates.email = data.email.toLowerCase();
  }

  if (data.role !== undefined) {
    updates.role = data.role;
  }

  const user = await User.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  }).select('-password');

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return user;
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
