import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { protect, requireShop } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(protect, requireShop);

// Get current open session
router.get('/current', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const userId = authReq.user!.id;

    const session = await prisma.cashDrawerSession.findFirst({
      where: { shopId, userId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });

    if (!session) {
      return res.json({ success: true, data: null });
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        shopId,
        userId: session.userId,
        paymentMethod: 'CASH',
        createdAt: { gte: session.openedAt },
      },
    });

    const cashSales = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0);
    const expectedCash = Number(session.startingCash) + cashSales;

    res.json({ success: true, data: { ...session, cashSales, expectedCash } });
  } catch (error) { next(error); }
});

// Open new session
router.post('/open', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const userId = authReq.user!.id;
    const { startingCash, notes } = req.body;

    // Check if already open
    const existing = await prisma.cashDrawerSession.findFirst({
      where: { shopId, userId, status: 'OPEN' },
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'A cash drawer session is already open' });
    }

    const session = await prisma.cashDrawerSession.create({
      data: {
        shopId,
        userId,
        startingCash: startingCash || 0,
        notes,
      },
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) { next(error); }
});

// Close session
router.post('/:id/close', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const { actualCash, notes } = req.body;

    const session = await prisma.cashDrawerSession.findUnique({
      where: { id: req.params.id },
    });

    if (!session || session.shopId !== shopId) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (session.status === 'CLOSED') {
      return res.status(400).json({ success: false, message: 'Session is already closed' });
    }

    // Calculate expected cash: startingCash + all CASH invoices since openedAt
    const invoices = await prisma.invoice.findMany({
      where: {
        shopId,
        userId: session.userId,
        paymentMethod: 'CASH',
        createdAt: { gte: session.openedAt },
      },
    });

    const cashSales = invoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0);
    const expectedCash = Number(session.startingCash) + cashSales;
    const difference = Number(actualCash) - expectedCash;

    const updated = await prisma.cashDrawerSession.update({
      where: { id: req.params.id },
      data: {
        closedAt: new Date(),
        status: 'CLOSED',
        expectedCash,
        actualCash,
        difference,
        notes: notes ? `${session.notes || ''}\nClosing Notes: ${notes}` : session.notes,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// Get all sessions
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const shopId = authReq.user!.shopId!;
    const { from, to } = req.query;

    const where: any = { shopId };
    if (from || to) {
      where.openedAt = {};
      if (from) where.openedAt.gte = new Date(from as string);
      if (to) where.openedAt.lte = new Date(to as string);
    }

    const sessions = await prisma.cashDrawerSession.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { openedAt: 'desc' },
    });

    res.json({ success: true, data: sessions });
  } catch (error) { next(error); }
});

export default router;