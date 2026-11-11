import User from '../models/User.js';
import Feedback from '../models/Feedback.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toUser } from '../utils/serialize.js';
import { normalizeRole } from '../utils/constants.js';

/** GET /api/users (admin) — registered users with review counts. */
export const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

  const [users, total] = await Promise.all([
    User.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(),
  ]);

  const counts = await Feedback.aggregate([
    { $group: { _id: '$user', count: { $sum: 1 } } },
  ]);
  const countByUser = new Map(counts.map((entry) => [entry._id.toString(), entry.count]));

  res.json({
    total,
    page,
    limit,
    users: users.map((user) => ({
      ...toUser(user),
      feedback_count: countByUser.get(user._id.toString()) || 0,
    })),
  });
});

/** PATCH /api/users/:id/role (admin) */
export const updateUserRole = asyncHandler(async (req, res) => {
  const role = normalizeRole(req.body.role);
  if (!role) throw ApiError.badRequest('role must be ADMIN or STUDENT');

  if (req.params.id === req.user._id.toString() && role !== 'ADMIN') {
    throw ApiError.badRequest('You cannot remove your own administrator access');
  }

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('User not found');
  res.json(toUser(user));
});

/** DELETE /api/users/:id (admin) */
export const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw ApiError.badRequest('You cannot delete your own account');
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  await Feedback.deleteMany({ user: user._id });
  res.json({ message: 'User deleted', id: req.params.id });
});
