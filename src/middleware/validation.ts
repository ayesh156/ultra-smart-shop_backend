import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

export const sanitizeRequestBody = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    const sanitize = (obj: Record<string, unknown>): Record<string, unknown> => {
      const clean: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        if (typeof value === 'string') {
          clean[key] = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        } else if (Array.isArray(value)) {
          clean[key] = value;
        } else if (value && typeof value === 'object') {
          clean[key] = sanitize(value as Record<string, unknown>);
        } else {
          clean[key] = value;
        }
      }
      return clean;
    };
    req.body = sanitize(req.body);
  }
  next();
};

export const validateProduct = [
  body('name').notEmpty().withMessage('Product name is required').trim(),
  body('sellingPrice').isFloat({ min: 0 }).withMessage('Selling price must be >= 0'),
  body('costPrice').optional().isFloat({ min: 0 }),
  body('wholesalePrice').optional().isFloat({ min: 0 }),
  body('stockQuantity').optional().isInt({ min: 0 }),
  body('minStockLevel').optional().isInt({ min: 0 }),
  handleValidationErrors,
];

export const validateCategory = [
  body('name').notEmpty().withMessage('Category name is required').trim(),
  handleValidationErrors,
];

export const validateBrand = [
  body('name').notEmpty().withMessage('Brand name is required').trim(),
  handleValidationErrors,
];

export const validateInvoice = [
  body('type').isIn(['QUICK', 'WHOLESALE']).withMessage('Invalid invoice type'),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.productName').notEmpty().withMessage('Product name is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be >= 1'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be >= 0'),
  handleValidationErrors,
];

export const validateCustomer = [
  body('name').notEmpty().withMessage('Customer name is required').trim(),
  body('phone').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('creditLimit').optional().isFloat({ min: 0 }),
  handleValidationErrors,
];

export const validateSupplier = [
  body('name').notEmpty().withMessage('Supplier name is required').trim(),
  body('phone').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email'),
  handleValidationErrors,
];
