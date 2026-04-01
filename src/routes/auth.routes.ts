import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { jwtConfig, passwordConfig } from '../config/security.js';
import { authRateLimiter, sensitiveRateLimiter } from '../middleware/rateLimiter.js';
import { protect } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Shared shop select — includes permissions for frontend role checks
const shopSelect = {
  id: true, name: true, address: true, phone: true, email: true,
  barcodePrefix: true, barcodeLength: true, barcodeNumbersOnly: true,
  cashierCanCreateProducts: true, cashierCanEditProducts: true,
  cashierCanCreateCustomers: true, cashierCanEditCustomers: true,
  cashierCanCreateSuppliers: true, cashierCanEditSuppliers: true,
  cashierCanViewReports: true, cashierCanAdjustStock: true,
  cashierCanCreateWholesale: true,
} as const;

// Token generation helpers
const generateAccessToken = (payload: object): string => {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.accessTokenExpiry as any,
  });
};

const generateRefreshToken = (payload: object): string => {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshTokenExpiry as any,
  });
};

// Register shop + admin user
router.post('/register', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { shopName, name, email, password } = req.body;
    if (!shopName || !name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
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

    const shop = await prisma.shop.create({
      data: {
        name: shopName,
        users: {
          create: { email, password: hashedPassword, name, role: 'ADMIN' },
        },
      },
      include: { users: true },
    });

    const user = shop.users[0];
    const accessToken = generateAccessToken(
      { id: user.id, email: user.email, role: user.role, shopId: shop.id }
    );
    const refreshToken = generateRefreshToken({ id: user.id });

    res.cookie(jwtConfig.cookieName, refreshToken, jwtConfig.getCookieOptions());
    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        shop: { id: shop.id, name: shop.name },
        accessToken,
        refreshToken, // Also in body for localStorage fallback
      },
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { shop: { select: shopSelect } },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account is deactivated' });
    }

    const accessToken = generateAccessToken(
      { id: user.id, email: user.email, role: user.role, shopId: user.shopId }
    );
    const refreshToken = generateRefreshToken({ id: user.id });

    res.cookie(jwtConfig.cookieName, refreshToken, jwtConfig.getCookieOptions());
    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        shop: user.shop,
        accessToken,
        refreshToken, // Also in body for localStorage fallback
      },
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post('/refresh', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Accept refresh token from cookie OR body (localStorage fallback)
    const refreshToken = req.cookies?.[jwtConfig.cookieName] || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, code: 'NO_REFRESH_TOKEN', message: 'No refresh token' });
    }

    let decoded: { id: string };
    try {
      decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret) as { id: string };
    } catch {
      return res.status(401).json({ success: false, code: 'REFRESH_TOKEN_EXPIRED', message: 'Refresh token expired' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, isActive: true, shopId: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, code: 'INVALID_USER', message: 'Invalid refresh token' });
    }

    // Get shop info (includes permissions)
    const shop = user.shopId ? await prisma.shop.findUnique({
      where: { id: user.shopId },
      select: shopSelect,
    }) : null;

    // Generate new access token
    const accessToken = generateAccessToken(
      { id: user.id, email: user.email, role: user.role, shopId: user.shopId }
    );

    // Generate new refresh token (rotation for security)
    const newRefreshToken = generateRefreshToken({ id: user.id });

    res.cookie(jwtConfig.cookieName, newRefreshToken, jwtConfig.getCookieOptions());
    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        shop,
        accessToken,
        refreshToken: newRefreshToken, // Also in body for localStorage fallback
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const user = await prisma.user.findUnique({
      where: { id: authReq.user!.id },
      select: { id: true, email: true, name: true, role: true, shopId: true },
    });
    const shop = user?.shopId ? await prisma.shop.findUnique({
      where: { id: user.shopId },
      select: shopSelect,
    }) : null;
    res.json({ success: true, data: { user, shop } });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', protect, (_req: Request, res: Response) => {
  res.clearCookie(jwtConfig.cookieName);
  res.json({ success: true, message: 'Logged out' });
});

export default router;
