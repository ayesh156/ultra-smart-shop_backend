import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { protect, requireShop, authorize } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { validateCategory } from '../middleware/validation.js';

const router = Router();
router.use(protect, requireShop);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const categories = await prisma.category.findMany({
      where: { shopId: authReq.user!.shopId! },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
});

router.post('/', validateCategory, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const { shopId: _, ...data } = req.body;
    const category = await prisma.category.create({ data: { ...data, shopId } });
    res.status(201).json({ success: true, data: category });
  } catch (error) { next(error); }
});

router.put('/:id', authorize('ADMIN'), validateCategory, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Category not found' });
    if (existing.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });
    const { shopId: _, id: __, ...data } = req.body;
    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: category });
  } catch (error) { next(error); }
});

router.delete('/:id', authorize('ADMIN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const existing = await prisma.category.findUnique({ where: { id: req.params.id }, include: { _count: { select: { products: true } } } });
    if (!existing) return res.status(404).json({ success: false, message: 'Category not found' });
    if (existing.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });
    if (existing._count.products > 0) return res.status(400).json({ success: false, message: 'Cannot delete category with products' });
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) { next(error); }
});

export default router;
