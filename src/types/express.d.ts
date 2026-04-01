import { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  shopId: string | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  requestId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      requestId?: string;
    }
  }
}
