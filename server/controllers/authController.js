import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../utils/token.js';
import { toUser } from '../utils/serialize.js';
import { normalizeRole } from '../utils/constants.js';

/** POST /api/auth/register */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  // Public sign-ups can never self-assign the ADMIN role.
  const requestedRole = normalizeRole(role);
  const user = await User.create({
    name,
    email,
    password,
    role: requestedRole === 'ADMIN' ? 'STUDENT' : requestedRole || 'STUDENT',
  });

  const token = signToken(user);
  res.status(201).json({ token, user: toUser(user) });
});

/** POST /api/auth/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const matches = await user.comparePassword(password);
  if (!matches) throw ApiError.unauthorized('Invalid email or password');

  const token = signToken(user);
  res.json({ token, user: toUser(user) });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  res.json({ user: toUser(req.user) });
});

/**
 * POST /api/auth/logout
 * JWTs are stateless, so logout is completed by the client discarding its token.
 * The endpoint exists so the UI has a single, explicit place to call.
 */
export const logout = asyncHandler(async (_req, res) => {
  res.json({ message: 'Logged out successfully' });
});
