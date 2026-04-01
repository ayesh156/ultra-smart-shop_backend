/**
 * Product Variant Routes
 * CRUD for product variants (color, storage, RAM, etc.)
 */
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { protect, requireShop, authorize } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { sensitiveRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();
router.use(protect, requireShop);

// GET all variants for a product
router.get('/product/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    const variants = await prisma.productVariant.findMany({
      where: { productId: req.params.productId, shopId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: variants });
  } catch (error) {
    next(error);
  }
});

// GET single variant
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const variant = await prisma.productVariant.findUnique({ where: { id: req.params.id } });
    if (!variant) return res.status(404).json({ success: false, message: 'Variant not found' });
    if (variant.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({ success: true, data: variant });
  } catch (error) {
    next(error);
  }
});

// GET variant by barcode
router.get('/barcode/:barcode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const variant = await prisma.productVariant.findFirst({
      where: { barcode: req.params.barcode, shopId },
      include: { product: { include: { category: { select: { id: true, name: true } }, brand: { select: { id: true, name: true } } } } },
    });

    if (!variant) return res.status(404).json({ success: false, message: 'Variant not found with this barcode' });

    res.json({ success: true, data: variant });
  } catch (error) {
    next(error);
  }
});

// CREATE variant
router.post('/', sensitiveRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const { shopId: _, productId, name, attributes, sku, barcode, costPrice, sellingPrice, wholesalePrice, stockQuantity } = req.body;

    if (!productId || !name) {
      return res.status(400).json({ success: false, message: 'Product ID and variant name are required' });
    }

    // Verify product belongs to shop
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        shopId,
        name,
        attributes: typeof attributes === 'string' ? attributes : JSON.stringify(attributes || {}),
        sku: sku || null,
        barcode: barcode || null,
        costPrice: costPrice || 0,
        sellingPrice: sellingPrice || 0,
        wholesalePrice: wholesalePrice || 0,
        stockQuantity: stockQuantity || 0,
      },
    });

    res.status(201).json({ success: true, data: variant });
  } catch (error) {
    next(error);
  }
});

// UPDATE variant (admin only)
router.put('/:id', authorize('ADMIN'), sensitiveRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const existing = await prisma.productVariant.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Variant not found' });
    if (existing.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    const { shopId: _, productId: _pid, id: _id, ...safeData } = req.body;
    if (safeData.attributes && typeof safeData.attributes !== 'string') {
      safeData.attributes = JSON.stringify(safeData.attributes);
    }

    const variant = await prisma.productVariant.update({
      where: { id: req.params.id },
      data: safeData,
    });

    res.json({ success: true, data: variant });
  } catch (error) {
    next(error);
  }
});

// DELETE variant (admin only)
router.delete('/:id', authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const existing = await prisma.productVariant.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Variant not found' });
    if (existing.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    await prisma.productVariant.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Variant deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
