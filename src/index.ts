import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// .env Load (CommonJS compatible pathing)
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend', '.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`📁 Loading .env from: ${envPath}`);
    dotenv.config({ path: envPath });
    break;
  }
}

import { errorHandler } from './middleware/errorHandler.ts';
import { notFound } from './middleware/notFound.ts';
import { apiRateLimiter } from './middleware/rateLimiter.ts';
import { sanitizeRequestBody } from './middleware/validation.ts';
import { corsConfig } from './config/security.ts';
import { connectDB } from './lib/prisma.ts';

import authRoutes from './routes/auth.routes.ts';
import productRoutes from './routes/product.routes.ts';
import categoryRoutes from './routes/category.routes.ts';
import brandRoutes from './routes/brand.routes.ts';
import invoiceRoutes from './routes/invoice.routes.ts';
import stockRoutes from './routes/stock.routes.ts';
import customerRoutes from './routes/customer.routes.ts';
import supplierRoutes from './routes/supplier.routes.ts';
import shopRoutes from './routes/shop.routes.ts';
import variantRoutes from './routes/variant.routes.ts';
import userRoutes from './routes/user.routes.ts';
import cashdrawerRoutes from './routes/cashdrawer.routes.ts';

const app = express();
const PORT = process.env.PORT || 3002;

// VPS Reverse Proxy trust proxy
app.set('trust proxy', 1);

// [FIX] Origin Header Cleaning Middleware
app.use((req, _res, next) => {
  const origin = req.headers.origin;
  if (origin && typeof origin === 'string' && origin.includes(',')) {
    req.headers.origin = origin.split(',')[0].trim();
  }
  next();
});

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cookieParser());

// CORS Configuration
app.use(cors({
  origin: corsConfig.validateOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeRequestBody);
app.use(apiRateLimiter);

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan(':method :url :status :response-time ms'));
}

const API = '/api/v1';

// Health Check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Test Page
app.get(`${API}/test`, (_req, res) => {
  const uptime = process.uptime();
  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;

  res.send(`
    <body style="background:#0f172a; color:#10b981; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh;">
      <div style="border:1px solid #10b981; padding:40px; border-radius:24px; text-align:center;">
        <h1>🚀 Ultra Smart Shop 2.0 API</h1>
        <p>Running on: api.ultrasmart.ecosystemlk.app</p>
        <p>Uptime: ${uptimeStr}</p>
        <p style="color:#94a3b8;">Port: ${PORT} | Env: ${process.env.NODE_ENV}</p>
      </div>
    </body>
  `);
});

// Root Route
app.get('/', (_req, res) => {
  res.json({ name: 'Ultra Smart Shop 2 API', status: 'running', port: PORT });
});

// API Routes
app.use(`${API}/auth`, authRoutes);
app.use(`${API}/products`, productRoutes);
app.use(`${API}/categories`, categoryRoutes);
app.use(`${API}/brands`, brandRoutes);
app.use(`${API}/invoices`, invoiceRoutes);
app.use(`${API}/stock`, stockRoutes);
app.use(`${API}/customers`, customerRoutes);
app.use(`${API}/suppliers`, supplierRoutes);
app.use(`${API}/shop`, shopRoutes);
app.use(`${API}/variants`, variantRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/cash-drawer`, cashdrawerRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(process.cwd(), '..', 'frontend', 'dist');

  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath, { maxAge: '30d', immutable: true }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path === '/health') return next();
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }
}

// Error Handling
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
export default app;
