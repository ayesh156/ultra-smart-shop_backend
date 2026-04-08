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
      'barcodePrefix', 'barcodeLength', 'barcodeNumbersOnly', 'lastBarcode',
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

// Generate next barcode (auto-increment from last)
router.post('/generate-barcode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });

    const prefix = (shop.barcodePrefix || '').replace(/\D/g, ''); // digits only for EAN-13
    // EAN-13: 12 data digits + 1 check digit = 13 total
    const dataLen = 12;
    const suffixLen = Math.max(1, dataLen - prefix.length);

    // Calculate EAN-13 check digit
    const calcCheckDigit = (digits12: string): string => {
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(digits12[i]) * (i % 2 === 0 ? 1 : 3);
      }
      const check = (10 - (sum % 10)) % 10;
      return check.toString();
    };

    let data12: string;

    if (shop.lastBarcode && shop.lastBarcode.length === 13 && /^\d{13}$/.test(shop.lastBarcode)) {
      // Extract first 12 digits (data) and increment
      const lastData = shop.lastBarcode.slice(0, 12);
      const lastSuffix = lastData.slice(prefix.length);
      const nextNum = BigInt(lastSuffix) + 1n;
      let nextSuffix = nextNum.toString().padStart(suffixLen, '0');
      // If overflow, wrap to 1
      if (nextSuffix.length > suffixLen) {
        nextSuffix = '1'.padStart(suffixLen, '0');
      }
      data12 = (prefix + nextSuffix).padStart(12, '0').slice(0, 12);
    } else {
      // No valid last barcode — start from 1
      const firstSuffix = '1'.padStart(suffixLen, '0');
      data12 = (prefix + firstSuffix).padStart(12, '0').slice(0, 12);
    }

    const newBarcode = data12 + calcCheckDigit(data12);

    // Save lastBarcode
    await prisma.shop.update({
      where: { id: shopId },
      data: { lastBarcode: newBarcode },
    });

    res.json({ success: true, data: { barcode: newBarcode } });
  } catch (error) { next(error); }
});

export default router;
