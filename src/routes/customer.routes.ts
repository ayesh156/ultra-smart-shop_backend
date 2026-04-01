import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { protect, requireShop, authorize } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { sensitiveRateLimiter } from '../middleware/rateLimiter.js';
import { validateCustomer } from '../middleware/validation.js';

const router = Router();
router.use(protect, requireShop);

// GET all customers
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const customers = await prisma.customer.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: customers });
  } catch (error) { next(error); }
});

// GET customer by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    if (customer.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({ success: true, data: customer });
  } catch (error) { next(error); }
});

// CREATE customer
router.post('/', sensitiveRateLimiter, validateCustomer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const { shopId: _, ...data } = req.body;

    const customer = await prisma.customer.create({
      data: { ...data, shopId },
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error) { next(error); }
});

// UPDATE customer
router.put('/:id', sensitiveRateLimiter, validateCustomer, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Customer not found' });
    if (existing.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    const { shopId: _, id: __, ...data } = req.body;

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: customer });
  } catch (error) { next(error); }
});

// DELETE customer
router.delete('/:id', authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Customer not found' });
    if (existing.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    await prisma.customer.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: 'Customer deactivated' });
  } catch (error) { next(error); }
});

export default router;
