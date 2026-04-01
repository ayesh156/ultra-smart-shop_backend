import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { protect, requireShop, authorize } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { sensitiveRateLimiter } from '../middleware/rateLimiter.js';
import { validateSupplier } from '../middleware/validation.js';

const router = Router();
router.use(protect, requireShop);

// GET all suppliers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const suppliers = await prisma.supplier.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: suppliers });
  } catch (error) { next(error); }
});

// GET supplier by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });
    if (supplier.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({ success: true, data: supplier });
  } catch (error) { next(error); }
});

// CREATE supplier
router.post('/', sensitiveRateLimiter, validateSupplier, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const { shopId: _, ...data } = req.body;

    const supplier = await prisma.supplier.create({
      data: { ...data, shopId },
    });

    res.status(201).json({ success: true, data: supplier });
  } catch (error) { next(error); }
});

// UPDATE supplier
router.put('/:id', sensitiveRateLimiter, validateSupplier, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const existing = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Supplier not found' });
    if (existing.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    const { shopId: _, id: __, ...data } = req.body;

    const supplier = await prisma.supplier.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: supplier });
  } catch (error) { next(error); }
});

// DELETE supplier (admin only)
router.delete('/:id', authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const existing = await prisma.supplier.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Supplier not found' });
    if (existing.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    await prisma.supplier.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Supplier deactivated' });
  } catch (error) { next(error); }
});

export default router;
