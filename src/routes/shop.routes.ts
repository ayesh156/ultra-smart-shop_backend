import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { protect, requireShop, authorize } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { sensitiveRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();
router.use(protect, requireShop);

// GET shop settings
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

    res.json({ success: true, data: shop });
  } catch (error) { next(error); }
});

// UPDATE shop settings (admin only)
router.put('/', authorize('ADMIN'), sensitiveRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    // Only allow known safe fields — prevent relation/id tampering
    const allowedFields: Record<string, unknown> = {};
    const safeKeys = [
      'name', 'address', 'phone', 'email', 'logo',
      'barcodePrefix', 'barcodeLength', 'barcodeNumbersOnly',
      'cashierCanCreateProducts', 'cashierCanEditProducts',
      'cashierCanCreateCustomers', 'cashierCanEditCustomers',
      'cashierCanCreateSuppliers', 'cashierCanEditSuppliers',
      'cashierCanViewReports', 'cashierCanAdjustStock', 'cashierCanCreateWholesale',
    ];
    for (const key of safeKeys) {
      if (req.body[key] !== undefined) {
        allowedFields[key] = req.body[key];
      }
    }

    const shop = await prisma.shop.update({
      where: { id: shopId },
      data: allowedFields,
    });

    res.json({ success: true, data: shop });
  } catch (error) { next(error); }
});

export default router;
