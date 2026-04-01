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

// API Test Page — beautiful status page
app.get(`${API}/test`, (_req, res) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;
  const memUsage = process.memoryUsage();
  const memMB = (memUsage.heapUsed / 1024 / 1024).toFixed(1);
  
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ultra Smart Shop API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
      overflow: hidden;
    }
    .bg-grid {
      position: fixed;
      inset: 0;
      background-image: 
        linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px);
      background-size: 60px 60px;
      animation: gridMove 20s linear infinite;
    }
    @keyframes gridMove {
      0% { transform: translate(0, 0); }
      100% { transform: translate(60px, 60px); }
    }
    .glow-orb {
      position: fixed;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.15;
      animation: float 8s ease-in-out infinite;
    }
    .orb1 { width: 400px; height: 400px; background: #10b981; top: -100px; right: -100px; }
    .orb2 { width: 300px; height: 300px; background: #14b8a6; bottom: -80px; left: -80px; animation-delay: -4s; }
    .orb3 { width: 200px; height: 200px; background: #6ee7b7; top: 50%; left: 50%; animation-delay: -2s; }
    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(30px, -20px) scale(1.05); }
      66% { transform: translate(-20px, 20px) scale(0.95); }
    }
    .container {
      position: relative;
      z-index: 1;
      text-align: center;
      max-width: 520px;
      width: 90%;
    }
    .card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 24px;
      padding: 48px 40px;
      box-shadow: 0 0 60px rgba(16, 185, 129, 0.08), 0 25px 50px rgba(0,0,0,0.3);
    }
    .pulse-ring {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.1);
      margin-bottom: 28px;
      position: relative;
    }
    .pulse-ring::before {
      content: '';
      position: absolute;
      inset: -8px;
      border-radius: 50%;
      border: 2px solid rgba(16, 185, 129, 0.3);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.15); opacity: 0; }
    }
    .check-icon {
      width: 44px;
      height: 44px;
      stroke: #10b981;
      stroke-width: 2.5;
      fill: none;
      animation: drawCheck 0.8s ease-out 0.3s both;
    }
    @keyframes drawCheck {
      0% { stroke-dasharray: 100; stroke-dashoffset: 100; }
      100% { stroke-dasharray: 100; stroke-dashoffset: 0; }
    }
    .title {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #10b981;
      margin-bottom: 8px;
    }
    .status {
      font-size: 32px;
      font-weight: 700;
      background: linear-gradient(135deg, #10b981, #14b8a6, #6ee7b7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #94a3b8;
      font-size: 15px;
      margin-bottom: 32px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 28px;
    }
    .stat {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(51, 65, 85, 0.5);
      border-radius: 14px;
      padding: 16px 8px;
    }
    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: #e2e8f0;
    }
    .stat-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }
    .dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      margin-right: 8px;
      animation: blink 1.5s infinite;
      vertical-align: middle;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    .live-badge {
      display: inline-flex;
      align-items: center;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 20px;
      padding: 6px 16px;
      font-size: 13px;
      color: #10b981;
      font-weight: 500;
    }
    .footer {
      margin-top: 24px;
      color: #475569;
      font-size: 12px;
    }
    .endpoints {
      margin-top: 20px;
      text-align: left;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(51, 65, 85, 0.4);
      border-radius: 14px;
      padding: 16px 20px;
    }
    .endpoints-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #64748b;
      margin-bottom: 12px;
    }
    .endpoint {
      display: flex;
      align-items: center;
      padding: 5px 0;
      font-size: 13px;
      font-family: 'Cascadia Code', 'Fira Code', monospace;
    }
    .method {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      margin-right: 10px;
      min-width: 36px;
      text-align: center;
    }
    .path { color: #94a3b8; }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="glow-orb orb1"></div>
  <div class="glow-orb orb2"></div>
  <div class="glow-orb orb3"></div>
  
  <div class="container">
    <div class="card">
      <div class="pulse-ring">
        <svg class="check-icon" viewBox="0 0 24 24">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="22 4 12 14.01 9 11.01" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      
      <div class="title">Ultra Smart Shop</div>
      <div class="status">API is Running</div>
      <div class="subtitle">All systems operational</div>
      
      <div class="stats">
        <div class="stat">
          <div class="stat-value">${uptimeStr}</div>
          <div class="stat-label">Uptime</div>
        </div>
        <div class="stat">
          <div class="stat-value">${memMB} MB</div>
          <div class="stat-label">Memory</div>
        </div>
        <div class="stat">
          <div class="stat-value">v1.0</div>
          <div class="stat-label">Version</div>
        </div>
      </div>
      
      <div class="live-badge"><span class="dot"></span>Live &bull; ${process.env.NODE_ENV || 'development'}</div>
      
      <div class="endpoints">
        <div class="endpoints-title">API Endpoints</div>
        <div class="endpoint"><span class="method">POST</span><span class="path">/api/v1/auth/login</span></div>
        <div class="endpoint"><span class="method">GET</span><span class="path">/api/v1/products</span></div>
        <div class="endpoint"><span class="method">GET</span><span class="path">/api/v1/categories</span></div>
        <div class="endpoint"><span class="method">GET</span><span class="path">/api/v1/invoices</span></div>
        <div class="endpoint"><span class="method">GET</span><span class="path">/api/v1/customers</span></div>
        <div class="endpoint"><span class="method">GET</span><span class="path">/api/v1/stock</span></div>
      </div>
      
      <div class="footer">${new Date().toISOString()} &bull; Node ${process.version}</div>
    </div>
  </div>
</body>
</html>`);
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
