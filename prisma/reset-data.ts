/**
 * 🔄 Data Reset Script — Ultra Smart Shop
 * 
 * Removes ALL business data (products, invoices, customers, suppliers, stock, etc.)
 * while PRESERVING shop details and user accounts.
 * 
 * This is used after the demo phase to prepare the system for real shop data entry.
 * 
 * Usage:
 *   cd backend
 *   npx tsx prisma/reset-data.ts
 * 
 * What gets REMOVED:
 *   - Invoice items & Invoices
 *   - Stock movements
 *   - Product variants
 *   - Products
 *   - Categories
 *   - Brands
 *   - Customers
 *   - Suppliers
 * 
 * What gets PRESERVED:
 *   - Shop (name, address, phone, email, barcode settings)
 *   - Users (all user accounts with their roles and passwords)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetBusinessData() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║          🔄 DATA RESET — Ultra Smart Shop        ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  This will remove ALL business data while        ║');
  console.log('║  keeping shop details & user accounts.           ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  // Show what will be preserved
  const shops = await prisma.shop.findMany({
    select: { id: true, name: true },
  });
  const users = await prisma.user.findMany({
    select: { name: true, email: true, role: true, isActive: true },
  });

  console.log('🏪 Shops that will be PRESERVED:');
  shops.forEach(s => console.log(`   ✅ ${s.name} (${s.id})`));
  console.log('');

  console.log('👥 Users that will be PRESERVED:');
  users.forEach(u => console.log(`   ✅ ${u.name} (${u.email}) — ${u.role} ${u.isActive ? '' : '[INACTIVE]'}`));
  console.log('');

  // Count existing data
  const counts = {
    invoiceItems: await prisma.invoiceItem.count(),
    invoices: await prisma.invoice.count(),
    stockMovements: await prisma.stockMovement.count(),
    productVariants: await prisma.productVariant.count(),
    products: await prisma.product.count(),
    categories: await prisma.category.count(),
    brands: await prisma.brand.count(),
    customers: await prisma.customer.count(),
    suppliers: await prisma.supplier.count(),
  };

  console.log('📊 Data to be REMOVED:');
  Object.entries(counts).forEach(([key, count]) => {
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    console.log(`   🗑️  ${label}: ${count} records`);
  });
  console.log('');

  const totalRecords = Object.values(counts).reduce((a, b) => a + b, 0);
  if (totalRecords === 0) {
    console.log('ℹ️  No business data to remove. Database is already clean.');
    await prisma.$disconnect();
    return;
  }

  // Perform deletion in correct order (foreign key constraints)
  console.log('🧹 Removing business data...');

  // Step 1: Invoice items (depends on invoices, products, variants)
  const deletedInvoiceItems = await prisma.invoiceItem.deleteMany();
  console.log(`   ✅ Removed ${deletedInvoiceItems.count} invoice items`);

  // Step 2: Invoices (depends on users, shops)
  const deletedInvoices = await prisma.invoice.deleteMany();
  console.log(`   ✅ Removed ${deletedInvoices.count} invoices`);

  // Step 3: Stock movements (depends on products)
  const deletedStockMovements = await prisma.stockMovement.deleteMany();
  console.log(`   ✅ Removed ${deletedStockMovements.count} stock movements`);

  // Step 4: Product variants (depends on products)
  const deletedVariants = await prisma.productVariant.deleteMany();
  console.log(`   ✅ Removed ${deletedVariants.count} product variants`);

  // Step 5: Products (depends on categories, brands)
  const deletedProducts = await prisma.product.deleteMany();
  console.log(`   ✅ Removed ${deletedProducts.count} products`);

  // Step 6: Categories
  const deletedCategories = await prisma.category.deleteMany();
  console.log(`   ✅ Removed ${deletedCategories.count} categories`);

  // Step 7: Brands
  const deletedBrands = await prisma.brand.deleteMany();
  console.log(`   ✅ Removed ${deletedBrands.count} brands`);

  // Step 8: Customers
  const deletedCustomers = await prisma.customer.deleteMany();
  console.log(`   ✅ Removed ${deletedCustomers.count} customers`);

  // Step 9: Suppliers
  const deletedSuppliers = await prisma.supplier.deleteMany();
  console.log(`   ✅ Removed ${deletedSuppliers.count} suppliers`);

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║             ✅ DATA RESET COMPLETE                ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Shop details & user accounts preserved.         ║');
  console.log('║  All business data has been removed.             ║');
  console.log('║                                                   ║');
  console.log('║  You can now start entering real shop data        ║');
  console.log('║  through the application.                         ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  // Verification
  console.log('🔍 Verification:');
  console.log(`   🏪 Shops remaining: ${await prisma.shop.count()}`);
  console.log(`   👥 Users remaining: ${await prisma.user.count()}`);
  console.log(`   📦 Products remaining: ${await prisma.product.count()}`);
  console.log(`   📄 Invoices remaining: ${await prisma.invoice.count()}`);
  console.log('');

  await prisma.$disconnect();
}

resetBusinessData()
  .catch((error) => {
    console.error('❌ Data reset failed:', error);
    prisma.$disconnect();
    process.exit(1);
  });
