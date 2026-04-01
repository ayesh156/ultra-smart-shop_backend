import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env FIRST
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend', '.env'),
  path.resolve(__dirname, '../.env'),
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`📁 Loading .env from: ${envPath}`);
    dotenv.config({ path: envPath });
    break;
  }
}

import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { sanitizeRequestBody } from './middleware/validation.js';
import { corsConfig } from './config/security.js';
import { connectDB } from './lib/prisma.js';

import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import categoryRoutes from './routes/category.routes.js';
import brandRoutes from './routes/brand.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import stockRoutes from './routes/stock.routes.js';
import customerRoutes from './routes/customer.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import shopRoutes from './routes/shop.routes.js';
import variantRoutes from './routes/variant.routes.js';
import userRoutes from './routes/user.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (nginx reverse proxy on VPS)
app.set('trust proxy', 1);

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cookieParser());
app.use(cors({
  origin: corsConfig.validateOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeRequestBody);
app.use(apiRateLimiter);

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan(':method :url :status :response-time ms'));
}

const API = '/api/v1';

// Health
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root
app.get('/', (_req, res) => {
  res.json({ 
    name: 'Ultra Smart Shop Management API', 
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: `${API}/auth`,
      products: `${API}/products`,
      categories: `${API}/categories`,
      brands: `${API}/brands`,
      invoices: `${API}/invoices`,
      stock: `${API}/stock`,
    }
  });
});

// Routes
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

// Serve frontend in production (single VPS deployment)
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath, { maxAge: '30d', immutable: true }));
    // SPA fallback — serve index.html for all non-API routes
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path === '/health') return next();
      res.sendFile(path.join(frontendPath, 'index.html'));
    });
  }
}

// Error handling
app.use(notFound);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Ultra Smart Shop API running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📡 API: http://localhost:${PORT}${API}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
export default app;
