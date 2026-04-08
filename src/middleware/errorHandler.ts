import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  statusCode: number;
  code?: string;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Friendly field name mapping for Prisma unique constraint errors
const friendlyFieldNames: Record<string, string> = {
  email: 'email address',
  barcode: 'barcode',
  sku: 'short code',
  name: 'name',
  phone: 'phone number',
  invoiceNumber: 'invoice number',
};

// Model name mapping for user-friendly messages
const friendlyModelNames: Record<string, string> = {
  Product: 'Product',
  ProductVariant: 'Product variant',
  Category: 'Category',
  Brand: 'Brand',
  Customer: 'Customer',
  Supplier: 'Supplier',
  User: 'User',
  Invoice: 'Invoice',
};

function handlePrismaError(err: Prisma.PrismaClientKnownRequestError): { statusCode: number; message: string } {
  switch (err.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = (err.meta?.target as string[]) || [];
      const fields = target.filter(f => f !== 'shopId');
      const model = (err.meta?.modelName as string) || '';
      const friendlyModel = friendlyModelNames[model] || model || 'Record';
      if (fields.length > 0) {
        const fieldNames = fields.map(f => friendlyFieldNames[f] || f).join(' and ');
        return { statusCode: 409, message: `${friendlyModel} with this ${fieldNames} already exists` };
      }
      return { statusCode: 409, message: `${friendlyModel} already exists` };
    }
    case 'P2003': {
      // Foreign key constraint violation
      const field = (err.meta?.field_name as string) || '';
      if (field.includes('categoryId')) return { statusCode: 400, message: 'Cannot delete this category — it is used by existing products' };
      if (field.includes('brandId')) return { statusCode: 400, message: 'Cannot delete this brand — it is used by existing products' };
      if (field.includes('productId')) return { statusCode: 400, message: 'Cannot delete this product — it has linked invoices or variants' };
      if (field.includes('customerId')) return { statusCode: 400, message: 'Cannot delete this customer — they have linked invoices' };
      if (field.includes('supplierId')) return { statusCode: 400, message: 'Cannot delete this supplier — it has linked records' };
      return { statusCode: 400, message: 'Cannot delete — this record is referenced by other data' };
    }
    case 'P2025': {
      // Record not found (e.g. update/delete on non-existent row)
      return { statusCode: 404, message: 'Record not found — it may have been deleted' };
    }
    case 'P2014': {
      // Required relation violation
      return { statusCode: 400, message: 'Cannot perform this action — required related data is missing' };
    }
    default:
      return { statusCode: 500, message: 'A database error occurred. Please try again' };
  }
}

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Handle Prisma known request errors (unique constraints, FK, not found, etc.)
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const { statusCode, message } = handlePrismaError(err);
    if (statusCode === 500) console.error('🚨 Prisma Error:', err);
    return res.status(statusCode).json({ success: false, message });
  }

  // Handle Prisma validation errors (invalid data types, etc.)
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ success: false, message: 'Invalid data provided. Please check your input and try again' });
  }

  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof AppError ? err.message : 'Internal server error';
  const code = (err as AppError & { code?: string }).code;

  if (statusCode === 500) {
    console.error('🚨 Server Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(code ? { code } : {}),
    ...(process.env.NODE_ENV === 'development' && statusCode === 500 ? { stack: err.stack } : {}),
  });
};
