/**
 * User Management Routes
 * Admin-only CRUD for shop users + password changes
 */
import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { protect, requireShop, authorize } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { sensitiveRateLimiter } from '../middleware/rateLimiter.js';
import { passwordConfig } from '../config/security.js';

const router = Router();
// 🔒 Apply authentication to ALL routes
router.use(protect, requireShop);

// GET all users in shop (admin or super_admin only)
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const users = await prisma.user.findMany({
      where: { shopId },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

// CREATE user (admin or super_admin only)
router.post('/', authorize('ADMIN', 'SUPER_ADMIN'), sensitiveRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const validRoles = ['ADMIN', 'CASHIER'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be ADMIN or CASHIER' });
    }

    const validation = passwordConfig.validate(password);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.errors[0] });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, passwordConfig.bcryptRounds);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'CASHIER',
        shopId,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// UPDATE user (admin or super_admin only) — name, email, role, isActive
router.put('/:id', authorize('ADMIN', 'SUPER_ADMIN'), sensitiveRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });
    if (existing.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    // 🛡️ SUPER_ADMIN protection: only the super admin themselves can modify their account
    if (existing.role === 'SUPER_ADMIN' && req.params.id !== authReq.user!.id) {
      return res.status(403).json({ success: false, message: 'Cannot modify system developer account' });
    }

    const { name, email, role, isActive } = req.body;
    const validRoles = ['ADMIN', 'CASHIER'];

    // Prevent changing SUPER_ADMIN role
    if (existing.role === 'SUPER_ADMIN' && role && role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot change system developer role' });
    }
    // Prevent promoting someone to SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && existing.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot assign SUPER_ADMIN role' });
    }
    if (role && role !== 'SUPER_ADMIN' && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Prevent disabling yourself
    if (req.params.id === authReq.user!.id && isActive === false) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
    }

    // 🛡️ Prevent deactivating SUPER_ADMIN
    if (existing.role === 'SUPER_ADMIN' && isActive === false) {
      return res.status(403).json({ success: false, message: 'Cannot deactivate system developer account' });
    }

    // Check email uniqueness if changed
    if (email && email !== existing.email) {
      const emailExists = await prisma.user.findUnique({ where: { email } });
      if (emailExists) return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// CHANGE PASSWORD — admin can change any user's, users can change their own
router.put('/:id/password', sensitiveRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const isOwnAccount = req.params.id === authReq.user!.id;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(authReq.user!.role);

    if (!isOwnAccount && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only admins can change other users\' passwords' });
    }

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });
    if (existing.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    // 🛡️ SUPER_ADMIN password can only be changed by themselves
    if (existing.role === 'SUPER_ADMIN' && !isOwnAccount) {
      return res.status(403).json({ success: false, message: 'Cannot change system developer password' });
    }

    const { currentPassword, newPassword } = req.body;

    // Own account requires current password
    if (isOwnAccount) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required' });
      }
      const isMatch = await bcrypt.compare(currentPassword, existing.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
    }

    if (!newPassword) {
      return res.status(400).json({ success: false, message: 'New password is required' });
    }

    const validation = passwordConfig.validate(newPassword);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.errors[0] });
    }

    const hashedPassword = await bcrypt.hash(newPassword, passwordConfig.bcryptRounds);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashedPassword },
    });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE user (admin or super_admin only) — actually deactivate, not hard delete
router.delete('/:id', authorize('ADMIN', 'SUPER_ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    if (req.params.id === authReq.user!.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });
    if (existing.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    // 🛡️ SUPER_ADMIN cannot be deleted by anyone
    if (existing.role === 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot delete system developer account' });
    }

    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
