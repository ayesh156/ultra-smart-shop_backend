import crypto from 'crypto';

const getIsProduction = () => process.env.NODE_ENV === 'production';
const getIsDevelopment = () => process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

let _devJwtSecret: string | null = null;
let _devRefreshSecret: string | null = null;

const getDevJwtSecret = () => {
  if (!_devJwtSecret) _devJwtSecret = crypto.randomBytes(32).toString('hex');
  return _devJwtSecret;
};
const getDevRefreshSecret = () => {
  if (!_devRefreshSecret) _devRefreshSecret = crypto.randomBytes(32).toString('hex');
  return _devRefreshSecret;
};

let validationRun = false;
const ensureValidated = () => {
  if (!validationRun) {
    validationRun = true;
    if (!process.env.JWT_SECRET) {
      if (getIsProduction()) console.error('🚨 JWT_SECRET is required in production!');
      else console.warn('⚠️  JWT_SECRET not set. Using dev fallback.');
    }
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  DATABASE_URL not set.');
    }
  }
};

export const jwtConfig = {
  get secret(): string {
    ensureValidated();
    return process.env.JWT_SECRET || getDevJwtSecret();
  },
  get refreshSecret(): string {
    ensureValidated();
    return process.env.JWT_REFRESH_SECRET || getDevRefreshSecret();
  },
  get accessTokenExpiry(): string {
    return process.env.ACCESS_TOKEN_EXPIRY || '15m';
  },
  get refreshTokenExpiry(): string {
    return process.env.REFRESH_TOKEN_EXPIRY || '7d';
  },
  cookieName: 'refreshToken' as const,
  getCookieOptions: () => {
    // Parse refresh token expiry to milliseconds for cookie maxAge
    const expiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';
    const match = expiry.match(/^(\d+)([smhd])$/);
    let maxAgeMs = 7 * 24 * 60 * 60 * 1000; // default 7 days
    if (match) {
      const num = parseInt(match[1]);
      const unit = match[2];
      switch (unit) {
        case 's': maxAgeMs = num * 1000; break;
        case 'm': maxAgeMs = num * 60 * 1000; break;
        case 'h': maxAgeMs = num * 60 * 60 * 1000; break;
        case 'd': maxAgeMs = num * 24 * 60 * 60 * 1000; break;
      }
    }
    return {
      httpOnly: true,
      secure: getIsProduction(),
      sameSite: (getIsProduction() ? 'none' : 'lax') as 'none' | 'lax',
      maxAge: maxAgeMs,
      path: '/',
    };
  },
};

export const corsConfig = {
  getAllowedOrigins: (): (string | RegExp)[] => {
    const origins: (string | RegExp)[] = [];
    if (process.env.FRONTEND_URL) origins.push(process.env.FRONTEND_URL);
    if (getIsDevelopment()) {
      origins.push('http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000');
    }
    return origins;
  },
  validateOrigin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    const allowedOrigins = corsConfig.getAllowedOrigins();
    const isAllowed = allowedOrigins.some(a => a instanceof RegExp ? a.test(origin) : a === origin);
    if (isAllowed) callback(null, true);
    else if (getIsDevelopment()) callback(null, true);
    else callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
};

export const passwordConfig = {
  minLength: 8,
  maxLength: 128,
  bcryptRounds: 12,
  validate: (password: string) => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Password must be at least 8 characters');
    if (password.length > 128) errors.push('Password too long');
    if (!/[A-Z]/.test(password)) errors.push('Must contain uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Must contain lowercase letter');
    if (!/\d/.test(password)) errors.push('Must contain a number');
    return { valid: errors.length === 0, errors };
  },
};
