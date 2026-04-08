import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { protect, requireShop, authorize } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { sensitiveRateLimiter } from '../middleware/rateLimiter.js';
import { validateProduct } from '../middleware/validation.js';

const router = Router();
router.use(protect, requireShop);

// GET all products
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const products = await prisma.product.findMany({
      where: { shopId },
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        _count: { select: { variants: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
});

// GET product by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: true, brand: true },
    });

    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    if (product.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// GET product by barcode or short code (also checks variant barcodes/short codes)
router.get('/barcode/:barcode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const code = req.params.barcode;

    // First check products by barcode
    const product = await prisma.product.findFirst({
      where: { barcode: code, shopId },
      include: { category: { select: { id: true, name: true } }, brand: { select: { id: true, name: true } } },
    });

    if (product) return res.json({ success: true, data: product });

    // Then check products by short code (sku)
    const productBySku = await prisma.product.findFirst({
      where: { sku: code, shopId },
      include: { category: { select: { id: true, name: true } }, brand: { select: { id: true, name: true } } },
    });

    if (productBySku) return res.json({ success: true, data: productBySku });

    // Then check variants by barcode
    const variant = await prisma.productVariant.findFirst({
      where: { barcode: code, shopId },
      include: { product: { include: { category: { select: { id: true, name: true } }, brand: { select: { id: true, name: true } } } } },
    });

    if (variant) {
      return res.json({
        success: true,
        data: {
          id: variant.productId,
          name: `${variant.product.name} — ${variant.name}`,
          barcode: variant.barcode,
          sku: variant.sku,
          costPrice: variant.costPrice,
          sellingPrice: variant.sellingPrice,
          wholesalePrice: variant.wholesalePrice,
          stockQuantity: variant.stockQuantity,
          category: variant.product.category,
          brand: variant.product.brand,
          isVariant: true,
          variantId: variant.id,
          variantName: variant.name,
        },
      });
    }

    // Then check variants by short code (sku)
    const variantBySku = await prisma.productVariant.findFirst({
      where: { sku: code, shopId },
      include: { product: { include: { category: { select: { id: true, name: true } }, brand: { select: { id: true, name: true } } } } },
    });

    if (variantBySku) {
      return res.json({
        success: true,
        data: {
          id: variantBySku.productId,
          name: `${variantBySku.product.name} — ${variantBySku.name}`,
          barcode: variantBySku.barcode,
          sku: variantBySku.sku,
          costPrice: variantBySku.costPrice,
          sellingPrice: variantBySku.sellingPrice,
          wholesalePrice: variantBySku.wholesalePrice,
          stockQuantity: variantBySku.stockQuantity,
          category: variantBySku.product.category,
          brand: variantBySku.product.brand,
          isVariant: true,
          variantId: variantBySku.id,
          variantName: variantBySku.name,
        },
      });
    }

    return res.status(404).json({ success: false, message: 'Product not found with this barcode or short code' });
  } catch (error) {
    next(error);
  }
});

// CHECK barcode availability (products + variants)
router.get('/barcode-availability/:barcode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const barcode = String(req.params.barcode || '').trim();
    const excludeProductId = typeof req.query.excludeProductId === 'string' ? req.query.excludeProductId : undefined;

    if (!barcode) {
      return res.status(400).json({ success: false, message: 'Barcode is required' });
    }

    const existingProduct = await prisma.product.findFirst({
      where: {
        shopId,
        barcode,
        ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
      },
      select: { id: true, name: true },
    });

    if (existingProduct) {
      return res.json({
        success: true,
        data: {
          available: false,
          source: 'product',
          productId: existingProduct.id,
          productName: existingProduct.name,
        },
      });
    }

    const existingVariant = await prisma.productVariant.findFirst({
      where: {
        shopId,
        barcode,
        ...(excludeProductId ? { productId: { not: excludeProductId } } : {}),
      },
      select: {
        id: true,
        name: true,
        productId: true,
        product: { select: { name: true } },
      },
    });

    if (existingVariant) {
      return res.json({
        success: true,
        data: {
          available: false,
          source: 'variant',
          variantId: existingVariant.id,
          variantName: existingVariant.name,
          productId: existingVariant.productId,
          productName: existingVariant.product.name,
        },
      });
    }

    return res.json({ success: true, data: { available: true } });
  } catch (error) {
    next(error);
  }
});

// CREATE product
router.post('/', sensitiveRateLimiter, validateProduct, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const { shopId: _, ...data } = req.body;

    const product = await prisma.product.create({
      data: { ...data, shopId },
      include: { category: { select: { id: true, name: true } }, brand: { select: { id: true, name: true } } },
    });

    // Create stock movement for initial stock
    if (product.stockQuantity > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          shopId,
          type: 'IN',
          quantity: product.stockQuantity,
          reason: 'Initial stock on product creation',
        },
      });
    }

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// UPDATE product
router.put('/:id', sensitiveRateLimiter, validateProduct, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    if (existing.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    const { shopId: _, id: __, ...data } = req.body;

    // Track stock change
    const oldStock = existing.stockQuantity;
    const newStock = data.stockQuantity ?? oldStock;
    
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { category: { select: { id: true, name: true } }, brand: { select: { id: true, name: true } } },
    });

    if (newStock !== oldStock) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          shopId,
          type: newStock > oldStock ? 'IN' : 'OUT',
          quantity: Math.abs(newStock - oldStock),
          reason: 'Stock adjustment via product update',
        },
      });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

// DELETE product (admin only)
router.delete('/:id', authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    if (existing.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Product deactivated' });
  } catch (error) {
    next(error);
  }
});

export default router;
