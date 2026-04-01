import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { protect, requireShop, authorize } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { sensitiveRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();
router.use(protect, requireShop);

// GET stock movements
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const { productId, type, from, to } = req.query;

    const where: Record<string, unknown> = { shopId };
    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (from || to) {
      where.createdAt = {} as Record<string, unknown>;
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from as string);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to as string);
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: { product: { select: { id: true, name: true, barcode: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    res.json({ success: true, data: movements });
  } catch (error) { next(error); }
});

// GET low stock products
router.get('/low-stock', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const products = await prisma.$queryRaw`
      SELECT id, name, barcode, sku, stockQuantity, minStockLevel, sellingPrice
      FROM Product
      WHERE shopId = ${shopId} AND isActive = true AND stockQuantity <= minStockLevel
      ORDER BY stockQuantity ASC
    `;

    res.json({ success: true, data: products });
  } catch (error) { next(error); }
});

// POST manual stock adjustment (admin only)
router.post('/adjust', authorize('ADMIN'), sensitiveRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const { productId, type, quantity, reason } = req.body;

    if (!productId || !type || !quantity) {
      return res.status(400).json({ success: false, message: 'productId, type, and quantity are required' });
    }
    if (!['IN', 'OUT', 'ADJUSTMENT'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be IN, OUT, or ADJUSTMENT' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: { productId, shopId, type, quantity: Math.abs(quantity), reason },
      });

      let stockChange = Math.abs(quantity);
      if (type === 'OUT') stockChange = -stockChange;
      if (type === 'ADJUSTMENT') stockChange = quantity; // Can be positive or negative

      await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: { increment: stockChange } },
      });

      return movement;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
});

export default router;
