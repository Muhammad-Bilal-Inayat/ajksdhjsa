import { Router } from 'express';
import {
  getUsersController,
  createUserController,
  updateUserController,
  toggleUserStatusController,
  resetPasscodeController,
  deleteUserController
} from '../controllers/userController';

export const userRouter = Router();

/**
 * GET /api/users
 * Retrieve all staff members and sub-users
 */
userRouter.get('/', getUsersController);

/**
 * POST /api/users
 * Create a new sub-user (Cashier, Pharmacist, Manager, Accountant)
 */
userRouter.post('/', createUserController);

/**
 * PUT /api/users/:id
 * Update staff / sub-user information
 */
userRouter.put('/:id', updateUserController);

/**
 * PUT /api/users/:id/status
 * Toggle status (Active / Inactive) - Guarded against Primary Owner
 */
userRouter.put('/:id/status', toggleUserStatusController);

/**
 * POST /api/users/:id/reset-passcode
 * Reset staff passcode
 */
userRouter.post('/:id/reset-passcode', resetPasscodeController);

/**
 * DELETE /api/users/:id
 * Delete a sub-user - Strict Primary Owner Immunity Guard
 */
userRouter.delete('/:id', deleteUserController);
