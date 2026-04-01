import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AppError } from './errorHandler.js';
import { jwtConfig } from '../config/security.js';
import type { AuthRequest, AuthUser } from '../types/express.js';

export type { AuthRequest };

export const protect = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) throw new AppError('No access token provided', 401);

    let decoded: { id: string; email: string; role: string; shopId: string | null };
    try {
      decoded = jwt.verify(token, jwtConfig.secret) as typeof decoded;
    } catch (jwtError) {
      if (jwtError instanceof TokenExpiredError) {
        const error = new AppError('Access token has expired', 401);
        (error as AppError & { code: string }).code = 'TOKEN_EXPIRED';
        throw error;
      }
      if (jwtError instanceof JsonWebTokenError) throw new AppError('Invalid access token', 401);
      throw jwtError;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, isActive: true, shopId: true },
    });

    if (!user) throw new AppError('User not found', 401);
    if (!user.isActive) throw new AppError('Account is deactivated', 401);

    (req as AuthRequest).user = user as AuthUser;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user) return next(new AppError('Not authorized', 403));
    // SUPER_ADMIN always has full access
    if (authReq.user.role === 'SUPER_ADMIN') return next();
    if (!roles.includes(authReq.user.role)) {
      return next(new AppError('Not authorized', 403));
    }
    next();
  };
};

export const requireShop = (req: Request, _res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  if (!authReq.user?.shopId) {
    return next(new AppError('User is not associated with any shop', 403));
  }
  next();
};
