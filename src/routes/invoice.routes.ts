import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { protect, requireShop, authorize } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { validateInvoice } from '../middleware/validation.js';
import { sensitiveRateLimiter } from '../middleware/rateLimiter.js';
import { Prisma } from '@prisma/client';

const router = Router();
router.use(protect, requireShop);

// Generate invoice number
async function generateInvoiceNumber(shopId: string, type: string): Promise<string> {
  const prefix = type === 'WHOLESALE' ? 'WS' : 'INV';
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  
  const count = await prisma.invoice.count({
    where: {
      shopId,
      type,
      createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) },
    },
  });

  return `${prefix}-${dateStr}-${String(count + 1).padStart(4, '0')}`;
}

// GET all invoices
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const { type, status, from, to } = req.query;

    const where: Prisma.InvoiceWhereInput = { shopId };
    if (type) where.type = type as string;
    if (status) where.status = status as string;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        items: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: invoices });
  } catch (error) { next(error); }
});

// GET invoice by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { items: true, user: { select: { id: true, name: true } } },
    });

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (invoice.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({ success: true, data: invoice });
  } catch (error) { next(error); }
});

// CREATE invoice
router.post('/', sensitiveRateLimiter, validateInvoice, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const userId = authReq.user!.id;

    const {
      type = 'QUICK',
      customerName, customerPhone, customerEmail,
      items, discount = 0, discountType = 'AMOUNT', tax = 0,
      paymentMethod = 'CASH', paidAmount, notes,
    } = req.body;

    const invoiceNumber = await generateInvoiceNumber(shopId, type);

    // Calculate totals
    let subtotal = 0;
    const invoiceItems: Array<{
      productId?: string;
      variantId?: string;
      productName: string;
      barcode?: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      total: number;
    }> = [];

    for (const item of items) {
      const itemTotal = (item.unitPrice * item.quantity) - (item.discount || 0);
      subtotal += itemTotal;
      invoiceItems.push({
        productId: item.productId || undefined,
        variantId: item.variantId || undefined,
        productName: item.productName,
        barcode: item.barcode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        total: itemTotal,
      });
    }

    const discountAmount = discountType === 'PERCENTAGE' ? (subtotal * discount / 100) : discount;
    const total = subtotal - discountAmount + tax;
    const paid = paidAmount ?? total;
    const paymentStatus = paid >= total ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';

    // Create invoice with items in transaction
    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          type,
          customerName,
          customerPhone,
          customerEmail,
          subtotal,
          discount: discountAmount,
          discountType,
          tax,
          total,
          paidAmount: paid,
          paymentMethod,
          paymentStatus,
          notes,
          userId,
          shopId,
          items: { create: invoiceItems },
        },
        include: { items: true },
      });

      // Deduct stock for items
      for (const item of invoiceItems) {
        if (item.variantId) {
          // Deduct from variant stock
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          // Create stock movement linked to parent product
          if (item.productId) {
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                shopId,
                type: 'OUT',
                quantity: item.quantity,
                reason: `Sale - ${invoiceNumber} (variant)`,
                reference: invoiceNumber,
              },
            });
          }
        } else if (item.productId) {
          // Standard product: deduct from product stock
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { decrement: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              shopId,
              type: 'OUT',
              quantity: item.quantity,
              reason: `Sale - ${invoiceNumber}`,
              reference: invoiceNumber,
            },
          });
        }
      }

      return inv;
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error) { next(error); }
});

// VOID invoice (admin only — financial security)
router.patch('/:id/void', authorize('ADMIN'), sensitiveRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;

    const existing = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!existing) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (existing.shopId !== shopId) return res.status(403).json({ success: false, message: 'Access denied' });
    if (existing.status !== 'COMPLETED') return res.status(400).json({ success: false, message: 'Only completed invoices can be voided' });

    const invoice = await prisma.$transaction(async (tx) => {
      // Restore stock
      for (const item of existing.items) {
        if (item.variantId) {
          // Restore variant stock
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
          if (item.productId) {
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                shopId,
                type: 'IN',
                quantity: item.quantity,
                reason: `Void - ${existing.invoiceNumber} (variant)`,
                reference: existing.invoiceNumber,
              },
            });
          }
        } else if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              shopId,
              type: 'IN',
              quantity: item.quantity,
              reason: `Void - ${existing.invoiceNumber}`,
              reference: existing.invoiceNumber,
            },
          });
        }
      }

      return tx.invoice.update({
        where: { id: req.params.id },
        data: { status: 'VOID' },
        include: { items: true },
      });
    });

    res.json({ success: true, data: invoice });
  } catch (error) { next(error); }
});

export default router;
