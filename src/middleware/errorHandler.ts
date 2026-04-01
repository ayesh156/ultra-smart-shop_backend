import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  code?: string;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof AppError ? err.message : 'Internal server error';
  const code = (err as AppError & { code?: string }).code;

  if (statusCode === 500) {
    console.error('🚨 Server Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(code ? { code } : {}),
    ...(process.env.NODE_ENV === 'development' && statusCode === 500 ? { stack: err.stack } : {}),
  });
};
