import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import { generateToken } from '../../utils/generateToken.js';

const buildSafeUser = (user) => {
  user.password = undefined;
  return user;
};

export const registerUser = async (name, email, password, role) => {
  const existingUser = await User.findOne({ email: email.toLowerCase() });

  if (existingUser) {
    const error = new Error('User with this email already exists.');
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role,
  });

  const token = generateToken(user._id.toString(), user.role);

  return {
    user: buildSafeUser(user),
    token,
  };
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
      role: user.role,
    },
    token,
  };
};
