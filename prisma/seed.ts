import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clean existing data (order matters for foreign key constraints)
  console.log('🧹 Cleaning existing data...');
  await prisma.productVariant.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.shop.deleteMany();
  console.log('   ✅ Database cleaned\n');

  // ==========================================
  // SHOP
  // ==========================================
  console.log('🏪 Creating shop...');
  const shop = await prisma.shop.create({
    data: {
      name: 'Ultra smart shop',
      address: 'No. 42, Main Street, Colombo 07, Sri Lanka',
      phone: '0112 345 678',
      email: 'info@ultrasmart.lk',
      barcodePrefix: '',
      barcodeLength: 10,
      barcodeNumbersOnly: true,
      // Staff (cashier) default permissions
      cashierCanCreateProducts: true,
      cashierCanEditProducts: false,
      cashierCanCreateCustomers: true,
      cashierCanEditCustomers: false,
      cashierCanCreateSuppliers: true,
      cashierCanEditSuppliers: false,
      cashierCanViewReports: false,
      cashierCanAdjustStock: false,
      cashierCanCreateWholesale: true,
    },
  });
  console.log(`   ✅ Shop: ${shop.name} (${shop.id})`);

  // ==========================================
  // SUPER ADMIN (System Developer — cannot be deleted)
  // ==========================================
  console.log('🛡️  Creating super admin...');
  const superAdminPassword = await bcrypt.hash('ayesh@2026', 12);
  const superAdmin = await prisma.user.create({
    data: {
      email: 'ayesh@gmail.com',
      password: superAdminPassword,
      name: 'Ayesh',
      role: 'SUPER_ADMIN',
      shopId: shop.id,
    },
  });
  console.log(`   ✅ Super Admin: ${superAdmin.email} / ayesh@2026`);

  // ==========================================
  // ADMIN USER
  // ==========================================
  console.log('👤 Creating admin user...');
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@ultrasmart.lk',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      shopId: shop.id,
    },
  });
  console.log(`   ✅ Admin: ${admin.email} / Admin@123`);

  // Cashier user
  console.log('👤 Creating cashier user...');
  const cashierPassword = await bcrypt.hash('Cashier@123', 12);
  const cashier = await prisma.user.create({
    data: {
      email: 'cashier@ultrasmart.lk',
      password: cashierPassword,
      name: 'Kasun Perera',
      role: 'CASHIER',
      shopId: shop.id,
    },
  });
  console.log(`   ✅ Cashier: ${cashier.email} / Cashier@123`);

  // Additional cashier
  const cashier2Password = await bcrypt.hash('Staff@123', 12);
  const cashier2 = await prisma.user.create({
    data: {
      email: 'nimal@ultrasmart.lk',
      password: cashier2Password,
      name: 'Nimal Bandara',
      role: 'CASHIER',
      shopId: shop.id,
    },
  });
  console.log(`   ✅ Cashier 2: ${cashier2.email} / Staff@123`);

  // Deactivated user (for testing)
  const inactivePassword = await bcrypt.hash('Inactive@123', 12);
  await prisma.user.create({
    data: {
      email: 'old.staff@ultrasmart.lk',
      password: inactivePassword,
      name: 'Sunil Rajapaksha',
      role: 'CASHIER',
      isActive: false,
      shopId: shop.id,
    },
  });
  console.log('   ✅ Inactive user: old.staff@ultrasmart.lk (deactivated)');

  // ==========================================
  // CATEGORIES
  // ==========================================
  console.log('📂 Creating categories...');
  const categoriesData = [
    { name: 'Mobile Phones', description: 'Smartphones and feature phones' },
    { name: 'Laptops', description: 'Notebooks and laptops' },
    { name: 'Tablets', description: 'Tablets and iPads' },
    { name: 'Accessories', description: 'Phone cases, chargers, cables, etc.' },
    { name: 'Headphones & Earbuds', description: 'Wired and wireless audio devices' },
    { name: 'Smart Watches', description: 'Smartwatches and fitness bands' },
    { name: 'Power Banks', description: 'Portable chargers and power banks' },
    { name: 'Speakers', description: 'Bluetooth and wired speakers' },
    { name: 'Screen Protectors', description: 'Tempered glass and film protectors' },
    { name: 'Memory Cards & USB', description: 'SD cards, USB drives, storage devices' },
  ];

  const categories: Record<string, string> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.create({
      data: { ...cat, shopId: shop.id },
    });
    categories[cat.name] = created.id;
  }
  console.log(`   ✅ Created ${categoriesData.length} categories`);

  // ==========================================
  // BRANDS
  // ==========================================
  console.log('🏷️ Creating brands...');
  const brandsData = [
    { name: 'Apple', description: 'Apple Inc. - iPhones, iPads, MacBooks' },
    { name: 'Samsung', description: 'Samsung Electronics - Galaxy series' },
    { name: 'Xiaomi', description: 'Xiaomi - Budget to mid-range phones' },
    { name: 'Huawei', description: 'Huawei Technologies' },
    { name: 'OPPO', description: 'OPPO - Camera phones' },
    { name: 'Realme', description: 'Realme - Value smartphones' },
    { name: 'Nokia', description: 'Nokia/HMD Global' },
    { name: 'JBL', description: 'JBL - Audio equipment' },
    { name: 'Anker', description: 'Anker - Charging accessories' },
    { name: 'Sony', description: 'Sony - Electronics and audio' },
    { name: 'Lenovo', description: 'Lenovo - Laptops and tablets' },
    { name: 'HP', description: 'HP - Laptops and printers' },
    { name: 'Baseus', description: 'Baseus - Accessories and cables' },
  ];

  const brands: Record<string, string> = {};
  for (const brand of brandsData) {
    const created = await prisma.brand.create({
      data: { ...brand, shopId: shop.id },
    });
    brands[brand.name] = created.id;
  }
  console.log(`   ✅ Created ${brandsData.length} brands`);

  // ==========================================
  // PRODUCTS
  // ==========================================
  console.log('📦 Creating products...');
  const productsData = [
    // Mobile Phones
    { name: 'iPhone 15 Pro Max 256GB', sku: 'APL-IP15PM-256', barcode: '1000000001', costPrice: 420000, sellingPrice: 485000, wholesalePrice: 465000, stockQuantity: 8, minStockLevel: 3, categoryId: categories['Mobile Phones'], brandId: brands['Apple'] },
    { name: 'iPhone 15 128GB', sku: 'APL-IP15-128', barcode: '1000000002', costPrice: 280000, sellingPrice: 325000, wholesalePrice: 310000, stockQuantity: 12, minStockLevel: 5, categoryId: categories['Mobile Phones'], brandId: brands['Apple'] },
    { name: 'Samsung Galaxy S24 Ultra 256GB', sku: 'SAM-S24U-256', barcode: '1000000003', costPrice: 380000, sellingPrice: 435000, wholesalePrice: 420000, stockQuantity: 6, minStockLevel: 3, categoryId: categories['Mobile Phones'], brandId: brands['Samsung'] },
    { name: 'Samsung Galaxy A55 128GB', sku: 'SAM-A55-128', barcode: '1000000004', costPrice: 85000, sellingPrice: 105000, wholesalePrice: 97000, stockQuantity: 20, minStockLevel: 5, categoryId: categories['Mobile Phones'], brandId: brands['Samsung'] },
    { name: 'Samsung Galaxy A15 64GB', sku: 'SAM-A15-64', barcode: '1000000005', costPrice: 38000, sellingPrice: 48000, wholesalePrice: 44000, stockQuantity: 30, minStockLevel: 10, categoryId: categories['Mobile Phones'], brandId: brands['Samsung'] },
    { name: 'Xiaomi 14 Ultra 512GB', sku: 'XIA-14U-512', barcode: '1000000006', costPrice: 310000, sellingPrice: 365000, wholesalePrice: 345000, stockQuantity: 4, minStockLevel: 2, categoryId: categories['Mobile Phones'], brandId: brands['Xiaomi'] },
    { name: 'Xiaomi Redmi Note 13 Pro', sku: 'XIA-RN13P', barcode: '1000000007', costPrice: 62000, sellingPrice: 78000, wholesalePrice: 72000, stockQuantity: 25, minStockLevel: 8, categoryId: categories['Mobile Phones'], brandId: brands['Xiaomi'] },
    { name: 'OPPO Reno 11 Pro 256GB', sku: 'OPP-R11P-256', barcode: '1000000008', costPrice: 120000, sellingPrice: 148000, wholesalePrice: 138000, stockQuantity: 10, minStockLevel: 4, categoryId: categories['Mobile Phones'], brandId: brands['OPPO'] },
    { name: 'Realme GT 5 Pro', sku: 'RLM-GT5P', barcode: '1000000009', costPrice: 140000, sellingPrice: 172000, wholesalePrice: 160000, stockQuantity: 7, minStockLevel: 3, categoryId: categories['Mobile Phones'], brandId: brands['Realme'] },
    { name: 'Nokia G42 5G', sku: 'NOK-G42-5G', barcode: '1000000010', costPrice: 42000, sellingPrice: 55000, wholesalePrice: 50000, stockQuantity: 15, minStockLevel: 5, categoryId: categories['Mobile Phones'], brandId: brands['Nokia'] },

    // Laptops
    { name: 'MacBook Air M3 13" 256GB', sku: 'APL-MBA-M3-256', barcode: '2000000001', costPrice: 380000, sellingPrice: 440000, wholesalePrice: 420000, stockQuantity: 5, minStockLevel: 2, categoryId: categories['Laptops'], brandId: brands['Apple'] },
    { name: 'MacBook Pro M3 Pro 14" 512GB', sku: 'APL-MBP-M3P-512', barcode: '2000000002', costPrice: 620000, sellingPrice: 720000, wholesalePrice: 695000, stockQuantity: 3, minStockLevel: 2, categoryId: categories['Laptops'], brandId: brands['Apple'] },
    { name: 'Lenovo IdeaPad Slim 3 15" i5', sku: 'LEN-IPS3-I5', barcode: '2000000003', costPrice: 145000, sellingPrice: 178000, wholesalePrice: 165000, stockQuantity: 8, minStockLevel: 3, categoryId: categories['Laptops'], brandId: brands['Lenovo'] },
    { name: 'HP Pavilion 15 i7 16GB', sku: 'HP-PAV15-I7', barcode: '2000000004', costPrice: 210000, sellingPrice: 258000, wholesalePrice: 240000, stockQuantity: 6, minStockLevel: 3, categoryId: categories['Laptops'], brandId: brands['HP'] },

    // Tablets
    { name: 'iPad 10th Gen 64GB WiFi', sku: 'APL-IPAD10-64', barcode: '3000000001', costPrice: 115000, sellingPrice: 142000, wholesalePrice: 132000, stockQuantity: 10, minStockLevel: 4, categoryId: categories['Tablets'], brandId: brands['Apple'] },
    { name: 'Samsung Galaxy Tab S9 FE', sku: 'SAM-TABS9FE', barcode: '3000000002', costPrice: 95000, sellingPrice: 118000, wholesalePrice: 110000, stockQuantity: 7, minStockLevel: 3, categoryId: categories['Tablets'], brandId: brands['Samsung'] },
    { name: 'Xiaomi Pad 6 128GB', sku: 'XIA-PAD6-128', barcode: '3000000003', costPrice: 65000, sellingPrice: 82000, wholesalePrice: 76000, stockQuantity: 9, minStockLevel: 4, categoryId: categories['Tablets'], brandId: brands['Xiaomi'] },

    // Accessories
    { name: 'Apple 20W USB-C Charger', sku: 'APL-CHG-20W', barcode: '4000000001', costPrice: 4500, sellingPrice: 7500, wholesalePrice: 6000, stockQuantity: 50, minStockLevel: 15, categoryId: categories['Accessories'], brandId: brands['Apple'] },
    { name: 'Samsung 25W Fast Charger', sku: 'SAM-CHG-25W', barcode: '4000000002', costPrice: 3800, sellingPrice: 5500, wholesalePrice: 4800, stockQuantity: 45, minStockLevel: 15, categoryId: categories['Accessories'], brandId: brands['Samsung'] },
    { name: 'Anker USB-C to Lightning Cable 1m', sku: 'ANK-CBL-CL-1M', barcode: '4000000003', costPrice: 2200, sellingPrice: 3500, wholesalePrice: 3000, stockQuantity: 80, minStockLevel: 20, categoryId: categories['Accessories'], brandId: brands['Anker'] },
    { name: 'Baseus 65W GaN Charger', sku: 'BSS-CHG-65W', barcode: '4000000004', costPrice: 5500, sellingPrice: 8500, wholesalePrice: 7200, stockQuantity: 30, minStockLevel: 10, categoryId: categories['Accessories'], brandId: brands['Baseus'] },
    { name: 'iPhone 15 Pro Silicone Case', sku: 'ACC-CASE-IP15P', barcode: '4000000005', costPrice: 800, sellingPrice: 2500, wholesalePrice: 1800, stockQuantity: 60, minStockLevel: 20, categoryId: categories['Accessories'], brandId: brands['Apple'] },

    // Headphones & Earbuds
    { name: 'Apple AirPods Pro 2nd Gen', sku: 'APL-APP2', barcode: '5000000001', costPrice: 62000, sellingPrice: 78000, wholesalePrice: 72000, stockQuantity: 15, minStockLevel: 5, categoryId: categories['Headphones & Earbuds'], brandId: brands['Apple'] },
    { name: 'Samsung Galaxy Buds FE', sku: 'SAM-BUDSFE', barcode: '5000000002', costPrice: 18000, sellingPrice: 25000, wholesalePrice: 22000, stockQuantity: 20, minStockLevel: 8, categoryId: categories['Headphones & Earbuds'], brandId: brands['Samsung'] },
    { name: 'JBL Tune 520BT Headphones', sku: 'JBL-T520BT', barcode: '5000000003', costPrice: 9500, sellingPrice: 14500, wholesalePrice: 12500, stockQuantity: 18, minStockLevel: 6, categoryId: categories['Headphones & Earbuds'], brandId: brands['JBL'] },
    { name: 'Sony WH-1000XM5', sku: 'SNY-WH1000XM5', barcode: '5000000004', costPrice: 82000, sellingPrice: 105000, wholesalePrice: 95000, stockQuantity: 5, minStockLevel: 2, categoryId: categories['Headphones & Earbuds'], brandId: brands['Sony'] },

    // Smart Watches
    { name: 'Apple Watch Series 9 45mm', sku: 'APL-AW9-45', barcode: '6000000001', costPrice: 125000, sellingPrice: 155000, wholesalePrice: 145000, stockQuantity: 6, minStockLevel: 3, categoryId: categories['Smart Watches'], brandId: brands['Apple'] },
    { name: 'Samsung Galaxy Watch 6 44mm', sku: 'SAM-GW6-44', barcode: '6000000002', costPrice: 72000, sellingPrice: 92000, wholesalePrice: 85000, stockQuantity: 8, minStockLevel: 3, categoryId: categories['Smart Watches'], brandId: brands['Samsung'] },
    { name: 'Xiaomi Smart Band 8', sku: 'XIA-SB8', barcode: '6000000003', costPrice: 6500, sellingPrice: 10500, wholesalePrice: 8800, stockQuantity: 35, minStockLevel: 10, categoryId: categories['Smart Watches'], brandId: brands['Xiaomi'] },

    // Power Banks
    { name: 'Anker PowerCore 20000mAh', sku: 'ANK-PB-20K', barcode: '7000000001', costPrice: 7500, sellingPrice: 12500, wholesalePrice: 10500, stockQuantity: 25, minStockLevel: 8, categoryId: categories['Power Banks'], brandId: brands['Anker'] },
    { name: 'Baseus Blade 20000mAh 65W', sku: 'BSS-BLD-20K', barcode: '7000000002', costPrice: 12000, sellingPrice: 18500, wholesalePrice: 16000, stockQuantity: 15, minStockLevel: 5, categoryId: categories['Power Banks'], brandId: brands['Baseus'] },
    { name: 'Xiaomi Power Bank 3 10000mAh', sku: 'XIA-PB3-10K', barcode: '7000000003', costPrice: 3500, sellingPrice: 5500, wholesalePrice: 4800, stockQuantity: 40, minStockLevel: 12, categoryId: categories['Power Banks'], brandId: brands['Xiaomi'] },

    // Speakers
    { name: 'JBL Flip 6 Bluetooth Speaker', sku: 'JBL-FLIP6', barcode: '8000000001', costPrice: 22000, sellingPrice: 32000, wholesalePrice: 28000, stockQuantity: 10, minStockLevel: 4, categoryId: categories['Speakers'], brandId: brands['JBL'] },
    { name: 'JBL Charge 5 Speaker', sku: 'JBL-CHG5', barcode: '8000000002', costPrice: 38000, sellingPrice: 52000, wholesalePrice: 47000, stockQuantity: 6, minStockLevel: 3, categoryId: categories['Speakers'], brandId: brands['JBL'] },

    // Screen Protectors
    { name: 'iPhone 15 Pro Tempered Glass', sku: 'SP-IP15P-TG', barcode: '9000000001', costPrice: 250, sellingPrice: 1200, wholesalePrice: 800, stockQuantity: 100, minStockLevel: 30, categoryId: categories['Screen Protectors'], brandId: brands['Baseus'] },
    { name: 'Samsung S24 Ultra Tempered Glass', sku: 'SP-S24U-TG', barcode: '9000000002', costPrice: 300, sellingPrice: 1500, wholesalePrice: 1000, stockQuantity: 80, minStockLevel: 25, categoryId: categories['Screen Protectors'], brandId: brands['Samsung'] },

    // Memory Cards & USB
    { name: 'Samsung EVO Plus 128GB MicroSD', sku: 'SAM-MC-128', barcode: '1100000001', costPrice: 3200, sellingPrice: 5000, wholesalePrice: 4200, stockQuantity: 50, minStockLevel: 15, categoryId: categories['Memory Cards & USB'], brandId: brands['Samsung'] },
    { name: 'Samsung EVO Plus 256GB MicroSD', sku: 'SAM-MC-256', barcode: '1100000002', costPrice: 5800, sellingPrice: 8500, wholesalePrice: 7500, stockQuantity: 30, minStockLevel: 10, categoryId: categories['Memory Cards & USB'], brandId: brands['Samsung'] },
  ];

  const products: { id: string; name: string; sellingPrice: number; wholesalePrice: number; barcode: string | null }[] = [];
  for (const prod of productsData) {
    const created = await prisma.product.create({
      data: {
        name: prod.name,
        sku: prod.sku,
        barcode: prod.barcode,
        costPrice: new Prisma.Decimal(prod.costPrice),
        sellingPrice: new Prisma.Decimal(prod.sellingPrice),
        wholesalePrice: new Prisma.Decimal(prod.wholesalePrice),
        stockQuantity: prod.stockQuantity,
        minStockLevel: prod.minStockLevel,
        categoryId: prod.categoryId,
        brandId: prod.brandId,
        shopId: shop.id,
      },
    });
    products.push({
      id: created.id,
      name: created.name,
      sellingPrice: prod.sellingPrice,
      wholesalePrice: prod.wholesalePrice,
      barcode: prod.barcode,
    });
  }
  console.log(`   ✅ Created ${productsData.length} products`);

  // ==========================================
  // PRODUCT VARIANTS
  // ==========================================
  console.log('🎨 Creating product variants...');

  // iPhone 15 Pro Max variants (Color)
  const iphone15PM = products[0]; // iPhone 15 Pro Max 256GB
  const iphone15Variants = [
    { name: 'Natural Titanium', attributes: '{"color":"Natural Titanium"}', sku: 'APL-IP15PM-256-NT', barcode: '1000100001', costPrice: 420000, sellingPrice: 485000, wholesalePrice: 465000, stockQuantity: 3 },
    { name: 'Blue Titanium', attributes: '{"color":"Blue Titanium"}', sku: 'APL-IP15PM-256-BT', barcode: '1000100002', costPrice: 420000, sellingPrice: 485000, wholesalePrice: 465000, stockQuantity: 2 },
    { name: 'White Titanium', attributes: '{"color":"White Titanium"}', sku: 'APL-IP15PM-256-WT', barcode: '1000100003', costPrice: 420000, sellingPrice: 485000, wholesalePrice: 465000, stockQuantity: 2 },
    { name: 'Black Titanium', attributes: '{"color":"Black Titanium"}', sku: 'APL-IP15PM-256-BK', barcode: '1000100004', costPrice: 420000, sellingPrice: 490000, wholesalePrice: 470000, stockQuantity: 1 },
  ];
  for (const v of iphone15Variants) {
    await prisma.productVariant.create({ data: { ...v, productId: iphone15PM.id, shopId: shop.id, costPrice: new Prisma.Decimal(v.costPrice), sellingPrice: new Prisma.Decimal(v.sellingPrice), wholesalePrice: new Prisma.Decimal(v.wholesalePrice) } });
  }

  // Samsung S24 Ultra variants (Color + Storage)
  const s24Ultra = products[2]; // Samsung Galaxy S24 Ultra 256GB
  const s24Variants = [
    { name: 'Titanium Gray 256GB', attributes: '{"color":"Titanium Gray","storage":"256GB"}', sku: 'SAM-S24U-256-TG', barcode: '1000200001', costPrice: 380000, sellingPrice: 435000, wholesalePrice: 420000, stockQuantity: 3 },
    { name: 'Titanium Violet 256GB', attributes: '{"color":"Titanium Violet","storage":"256GB"}', sku: 'SAM-S24U-256-TV', barcode: '1000200002', costPrice: 380000, sellingPrice: 435000, wholesalePrice: 420000, stockQuantity: 2 },
    { name: 'Titanium Gray 512GB', attributes: '{"color":"Titanium Gray","storage":"512GB"}', sku: 'SAM-S24U-512-TG', barcode: '1000200003', costPrice: 430000, sellingPrice: 495000, wholesalePrice: 475000, stockQuantity: 1 },
  ];
  for (const v of s24Variants) {
    await prisma.productVariant.create({ data: { ...v, productId: s24Ultra.id, shopId: shop.id, costPrice: new Prisma.Decimal(v.costPrice), sellingPrice: new Prisma.Decimal(v.sellingPrice), wholesalePrice: new Prisma.Decimal(v.wholesalePrice) } });
  }

  // MacBook Air M3 variants (Color + RAM)
  const macbookAir = products[10]; // MacBook Air M3 13" 256GB
  const macVariants = [
    { name: 'Midnight 8GB/256GB', attributes: '{"color":"Midnight","ram":"8GB","storage":"256GB"}', sku: 'APL-MBA-M3-MN-8-256', barcode: '2000100001', costPrice: 380000, sellingPrice: 440000, wholesalePrice: 420000, stockQuantity: 2 },
    { name: 'Starlight 8GB/256GB', attributes: '{"color":"Starlight","ram":"8GB","storage":"256GB"}', sku: 'APL-MBA-M3-SL-8-256', barcode: '2000100002', costPrice: 380000, sellingPrice: 440000, wholesalePrice: 420000, stockQuantity: 2 },
    { name: 'Midnight 16GB/512GB', attributes: '{"color":"Midnight","ram":"16GB","storage":"512GB"}', sku: 'APL-MBA-M3-MN-16-512', barcode: '2000100003', costPrice: 480000, sellingPrice: 560000, wholesalePrice: 535000, stockQuantity: 1 },
  ];
  for (const v of macVariants) {
    await prisma.productVariant.create({ data: { ...v, productId: macbookAir.id, shopId: shop.id, costPrice: new Prisma.Decimal(v.costPrice), sellingPrice: new Prisma.Decimal(v.sellingPrice), wholesalePrice: new Prisma.Decimal(v.wholesalePrice) } });
  }

  // JBL Flip 6 variants (Color)
  const jblFlip = products[32]; // JBL Flip 6
  const jblVariants = [
    { name: 'Black', attributes: '{"color":"Black"}', sku: 'JBL-FLIP6-BK', barcode: '8000100001', costPrice: 22000, sellingPrice: 32000, wholesalePrice: 28000, stockQuantity: 4 },
    { name: 'Red', attributes: '{"color":"Red"}', sku: 'JBL-FLIP6-RD', barcode: '8000100002', costPrice: 22000, sellingPrice: 32000, wholesalePrice: 28000, stockQuantity: 3 },
    { name: 'Blue', attributes: '{"color":"Blue"}', sku: 'JBL-FLIP6-BL', barcode: '8000100003', costPrice: 22000, sellingPrice: 32000, wholesalePrice: 28000, stockQuantity: 3 },
  ];
  for (const v of jblVariants) {
    await prisma.productVariant.create({ data: { ...v, productId: jblFlip.id, shopId: shop.id, costPrice: new Prisma.Decimal(v.costPrice), sellingPrice: new Prisma.Decimal(v.sellingPrice), wholesalePrice: new Prisma.Decimal(v.wholesalePrice) } });
  }

  const totalVariants = iphone15Variants.length + s24Variants.length + macVariants.length + jblVariants.length;
  console.log(`   ✅ Created ${totalVariants} product variants`);

  // ==========================================
  // SAMPLE INVOICES
  // ==========================================
  console.log('🧾 Creating sample invoices...');

  // Quick Invoice 1 - Walk-in customer (today)
  const inv1Items = [
    { product: products[4], qty: 1 },  // Samsung A15
    { product: products[19], qty: 1 }, // Anker Cable
    { product: products[35], qty: 1 }, // Screen Protector
  ];
  const inv1Subtotal = inv1Items.reduce((sum, i) => sum + i.product.sellingPrice * i.qty, 0);
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-0001',
      type: 'QUICK',
      subtotal: new Prisma.Decimal(inv1Subtotal),
      discount: new Prisma.Decimal(500),
      discountType: 'AMOUNT',
      tax: new Prisma.Decimal(0),
      total: new Prisma.Decimal(inv1Subtotal - 500),
      paidAmount: new Prisma.Decimal(inv1Subtotal - 500),
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
      status: 'COMPLETED',
      userId: admin.id,
      shopId: shop.id,
      createdAt: new Date('2026-03-31T09:15:00'),
      items: {
        create: inv1Items.map(i => ({
          productId: i.product.id,
          productName: i.product.name,
          barcode: i.product.barcode,
          quantity: i.qty,
          unitPrice: new Prisma.Decimal(i.product.sellingPrice),
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(i.product.sellingPrice * i.qty),
        })),
      },
    },
  });

  // Quick Invoice 2 - Walk-in AirPods sale
  const inv2Total = products[22].sellingPrice; // AirPods Pro
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-0002',
      type: 'QUICK',
      customerName: 'Nadeesha Silva',
      customerPhone: '0771234567',
      subtotal: new Prisma.Decimal(inv2Total),
      discount: new Prisma.Decimal(0),
      discountType: 'AMOUNT',
      tax: new Prisma.Decimal(0),
      total: new Prisma.Decimal(inv2Total),
      paidAmount: new Prisma.Decimal(inv2Total),
      paymentMethod: 'CARD',
      paymentStatus: 'PAID',
      status: 'COMPLETED',
      userId: cashier.id,
      shopId: shop.id,
      createdAt: new Date('2026-03-31T10:30:00'),
      items: {
        create: [{
          productId: products[22].id,
          productName: products[22].name,
          barcode: products[22].barcode,
          quantity: 1,
          unitPrice: new Prisma.Decimal(inv2Total),
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(inv2Total),
        }],
      },
    },
  });

  // Quick Invoice 3 - Multiple accessories
  const inv3Items = [
    { product: products[17], qty: 2 },  // Apple Charger x2
    { product: products[20], qty: 3 },  // iPhone Case x3
    { product: products[34], qty: 3 },  // Screen Protector x3
  ];
  const inv3Subtotal = inv3Items.reduce((sum, i) => sum + i.product.sellingPrice * i.qty, 0);
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-0003',
      type: 'QUICK',
      customerName: 'Ruwan Fernando',
      customerPhone: '0769876543',
      subtotal: new Prisma.Decimal(inv3Subtotal),
      discount: new Prisma.Decimal(1000),
      discountType: 'AMOUNT',
      tax: new Prisma.Decimal(0),
      total: new Prisma.Decimal(inv3Subtotal - 1000),
      paidAmount: new Prisma.Decimal(inv3Subtotal - 1000),
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
      status: 'COMPLETED',
      userId: admin.id,
      shopId: shop.id,
      createdAt: new Date('2026-03-30T14:20:00'),
      items: {
        create: inv3Items.map(i => ({
          productId: i.product.id,
          productName: i.product.name,
          barcode: i.product.barcode,
          quantity: i.qty,
          unitPrice: new Prisma.Decimal(i.product.sellingPrice),
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(i.product.sellingPrice * i.qty),
        })),
      },
    },
  });

  // Wholesale Invoice 1 - Bulk phone order
  const inv4Items = [
    { product: products[6], qty: 10, price: products[6].wholesalePrice },  // Redmi Note 13 Pro x10
    { product: products[4], qty: 15, price: products[4].wholesalePrice },  // Samsung A15 x15
  ];
  const inv4Subtotal = inv4Items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const inv4Discount = 25000;
  const inv4Total = inv4Subtotal - inv4Discount;
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-0004',
      type: 'WHOLESALE',
      customerName: 'Perera Mobile Traders',
      customerPhone: '0112567890',
      customerEmail: 'perera.traders@gmail.com',
      subtotal: new Prisma.Decimal(inv4Subtotal),
      discount: new Prisma.Decimal(inv4Discount),
      discountType: 'AMOUNT',
      tax: new Prisma.Decimal(0),
      total: new Prisma.Decimal(inv4Total),
      paidAmount: new Prisma.Decimal(inv4Total),
      paymentMethod: 'BANK_TRANSFER',
      paymentStatus: 'PAID',
      status: 'COMPLETED',
      userId: admin.id,
      shopId: shop.id,
      createdAt: new Date('2026-03-29T11:00:00'),
      items: {
        create: inv4Items.map(i => ({
          productId: i.product.id,
          productName: i.product.name,
          barcode: i.product.barcode,
          quantity: i.qty,
          unitPrice: new Prisma.Decimal(i.price),
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(i.price * i.qty),
        })),
      },
    },
  });

  // Quick Invoice 5 - Partial payment (unpaid)
  const inv5Total = products[0].sellingPrice; // iPhone 15 Pro Max
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-0005',
      type: 'QUICK',
      customerName: 'Chaminda Jayasinghe',
      customerPhone: '0756543210',
      subtotal: new Prisma.Decimal(inv5Total),
      discount: new Prisma.Decimal(5000),
      discountType: 'AMOUNT',
      tax: new Prisma.Decimal(0),
      total: new Prisma.Decimal(inv5Total - 5000),
      paidAmount: new Prisma.Decimal(300000),
      paymentMethod: 'MIXED',
      paymentStatus: 'PARTIAL',
      status: 'COMPLETED',
      userId: admin.id,
      shopId: shop.id,
      createdAt: new Date('2026-03-28T16:45:00'),
      items: {
        create: [{
          productId: products[0].id,
          productName: products[0].name,
          barcode: products[0].barcode,
          quantity: 1,
          unitPrice: new Prisma.Decimal(inv5Total),
          discount: new Prisma.Decimal(5000),
          total: new Prisma.Decimal(inv5Total - 5000),
        }],
      },
    },
  });

  // Quick Invoice 6 - Voided invoice
  const inv6Total = products[10].sellingPrice; // MacBook Air
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-0006',
      type: 'QUICK',
      customerName: 'Saman Kumara',
      customerPhone: '0781112233',
      subtotal: new Prisma.Decimal(inv6Total),
      discount: new Prisma.Decimal(0),
      discountType: 'AMOUNT',
      tax: new Prisma.Decimal(0),
      total: new Prisma.Decimal(inv6Total),
      paidAmount: new Prisma.Decimal(inv6Total),
      paymentMethod: 'CARD',
      paymentStatus: 'PAID',
      status: 'VOID',
      notes: 'Customer returned - wrong model',
      userId: cashier.id,
      shopId: shop.id,
      createdAt: new Date('2026-03-27T13:10:00'),
      items: {
        create: [{
          productId: products[10].id,
          productName: products[10].name,
          barcode: products[10].barcode,
          quantity: 1,
          unitPrice: new Prisma.Decimal(inv6Total),
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(inv6Total),
        }],
      },
    },
  });

  // Wholesale Invoice 2 - Big accessory order
  const inv7Items = [
    { product: products[29], qty: 20, price: products[29].wholesalePrice }, // Anker PowerCore
    { product: products[31], qty: 30, price: products[31].wholesalePrice }, // Xiaomi Power Bank
    { product: products[19], qty: 50, price: products[19].wholesalePrice }, // Anker Cable
  ];
  const inv7Subtotal = inv7Items.reduce((sum, i) => sum + i.price * i.qty, 0);
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-0007',
      type: 'WHOLESALE',
      customerName: 'Lanka Accessories Pvt Ltd',
      customerPhone: '0112998877',
      customerEmail: 'orders@lankaaccessories.lk',
      subtotal: new Prisma.Decimal(inv7Subtotal),
      discount: new Prisma.Decimal(15000),
      discountType: 'AMOUNT',
      tax: new Prisma.Decimal(0),
      total: new Prisma.Decimal(inv7Subtotal - 15000),
      paidAmount: new Prisma.Decimal(0),
      paymentMethod: 'BANK_TRANSFER',
      paymentStatus: 'UNPAID',
      status: 'COMPLETED',
      notes: 'Payment due within 30 days',
      userId: admin.id,
      shopId: shop.id,
      createdAt: new Date('2026-03-26T09:30:00'),
      items: {
        create: inv7Items.map(i => ({
          productId: i.product.id,
          productName: i.product.name,
          barcode: i.product.barcode,
          quantity: i.qty,
          unitPrice: new Prisma.Decimal(i.price),
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(i.price * i.qty),
        })),
      },
    },
  });

  // Quick Invoice 8 - Today, latest
  const inv8Items = [
    { product: products[2], qty: 1 },   // Samsung S24 Ultra
    { product: products[35], qty: 1 },   // Screen Protector
    { product: products[18], qty: 1 },   // Samsung 25W Charger
    { product: products[20], qty: 1 },   // iPhone Case (gift)
  ];
  const inv8Subtotal = inv8Items.reduce((sum, i) => sum + i.product.sellingPrice * i.qty, 0);
  await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-0008',
      type: 'QUICK',
      customerName: 'Dilshan Weerasinghe',
      customerPhone: '0773456789',
      subtotal: new Prisma.Decimal(inv8Subtotal),
      discount: new Prisma.Decimal(3000),
      discountType: 'AMOUNT',
      tax: new Prisma.Decimal(0),
      total: new Prisma.Decimal(inv8Subtotal - 3000),
      paidAmount: new Prisma.Decimal(inv8Subtotal - 3000),
      paymentMethod: 'CARD',
      paymentStatus: 'PAID',
      status: 'COMPLETED',
      userId: cashier.id,
      shopId: shop.id,
      createdAt: new Date('2026-03-31T11:45:00'),
      items: {
        create: inv8Items.map(i => ({
          productId: i.product.id,
          productName: i.product.name,
          barcode: i.product.barcode,
          quantity: i.qty,
          unitPrice: new Prisma.Decimal(i.product.sellingPrice),
          discount: new Prisma.Decimal(0),
          total: new Prisma.Decimal(i.product.sellingPrice * i.qty),
        })),
      },
    },
  });

  // ==========================================
  // CUSTOMERS
  // ==========================================
  console.log('👥 Creating customers...');
  const customersData = [
    { name: 'Nadeesha Silva', phone: '0771234567', email: 'nadeesha@gmail.com', nic: '199512345678', address: '45, Galle Road, Mount Lavinia', creditLimit: 100000, creditBalance: 0 },
    { name: 'Ruwan Fernando', phone: '0769876543', email: 'ruwan.f@gmail.com', nic: '198834567890', address: '12, Kandy Road, Kadawatha', creditLimit: 50000, creditBalance: 0 },
    { name: 'Chaminda Jayasinghe', phone: '0756543210', email: null, nic: '199045678901', address: '78, Temple Road, Nugegoda', creditLimit: 200000, creditBalance: 180000 },
    { name: 'Dilshan Weerasinghe', phone: '0773456789', email: 'dilshan.w@outlook.com', nic: '199256789012', address: '23, Colombo Road, Gampaha', creditLimit: 150000, creditBalance: 0 },
    { name: 'Saman Kumara', phone: '0781112233', email: null, nic: '198567890123', address: '56, Main Street, Panadura', creditLimit: 75000, creditBalance: 0 },
    { name: 'Perera Mobile Traders', phone: '0112567890', email: 'perera.traders@gmail.com', nic: null, address: '89, Pettah Market, Colombo 11', creditLimit: 500000, creditBalance: 0, notes: 'Wholesale customer - bulk orders' },
    { name: 'Lanka Accessories Pvt Ltd', phone: '0112998877', email: 'orders@lankaaccessories.lk', nic: null, address: '34, Industrial Zone, Katunayake', creditLimit: 1000000, creditBalance: 504000, notes: 'Major wholesale client - payment due INV-0007' },
    { name: 'Kumari Wijewardena', phone: '0714567890', email: 'kumari.w@gmail.com', nic: '199378901234', address: '67, Beach Road, Negombo', creditLimit: 100000, creditBalance: 0 },
    { name: 'Asanka Rathnayake', phone: '0759988776', email: null, nic: '199189012345', address: '90, Kandy Road, Peradeniya', creditLimit: 50000, creditBalance: 25000 },
    { name: 'Nimal Bandara', phone: '0723344556', email: 'nimal.b@yahoo.com', nic: '198290123456', address: '11, Lake Road, Kurunegala', creditLimit: 80000, creditBalance: 0 },
  ];

  for (const cust of customersData) {
    await prisma.customer.create({
      data: { ...cust, shopId: shop.id },
    });
  }
  console.log(`   ✅ Created ${customersData.length} customers`);

  // ==========================================
  // SUPPLIERS
  // ==========================================
  console.log('🏭 Creating suppliers...');
  const suppliersData = [
    { name: 'Apple Authorized - MiStore Lanka', contactName: 'Pradeep Silva', phone: '0112456789', email: 'orders@mistorelanka.lk', address: '100, Duplication Road, Colombo 03', paymentTerms: 'Net 30' },
    { name: 'Samsung Sri Lanka (Pvt) Ltd', contactName: 'Kamal Perera', phone: '0112345600', email: 'wholesale@samsung.lk', address: 'Samsung Building, 56, Union Place, Colombo 02', paymentTerms: 'Net 45' },
    { name: 'Xiaomi Lanka Distributor', contactName: 'Ashan Fernando', phone: '0771234500', email: 'supply@xiaomilanka.com', address: '23, Galle Road, Colombo 04', paymentTerms: 'COD' },
    { name: 'Redington Lanka (Pvt) Ltd', contactName: 'Nishantha Kumar', phone: '0112876500', email: 'orders@redington.lk', address: 'Redington House, Orion City, Colombo 09', paymentTerms: 'Net 30', notes: 'HP, Lenovo authorized distributor' },
    { name: 'Abans PLC - Wholesale', contactName: 'Manjula Dias', phone: '0112201201', email: 'wholesale@abans.com', address: '498, Galle Road, Colombo 03', paymentTerms: 'Net 60', notes: 'Major electronics distributor' },
    { name: 'JBL Audio Distributors Lanka', contactName: 'Ravindu Jayasuriya', phone: '0765432100', email: 'sales@jbllanka.com', address: '45, Ward Place, Colombo 07', paymentTerms: 'Net 15' },
    { name: 'Anker PowerHub lanka', contactName: 'Dinesh Rajapaksha', phone: '0718765432', email: 'supply@ankerlanka.com', address: '78, Nawala Road, Nugegoda', paymentTerms: 'COD' },
    { name: 'China Direct Import Co.', contactName: 'Chen Wei', phone: '0112334455', email: 'orders@chinadirect.lk', address: '12, Sea Street, Colombo 11', paymentTerms: 'Advance Payment', notes: 'Screen protectors, cases, cables - bulk import' },
  ];

  for (const sup of suppliersData) {
    await prisma.supplier.create({
      data: { ...sup, shopId: shop.id },
    });
  }
  console.log(`   ✅ Created ${suppliersData.length} suppliers`);

  // ==========================================
  // STOCK MOVEMENTS
  // ==========================================
  console.log('📊 Creating stock movements...');
  const stockMovements = [
    { productId: products[0].id, type: 'IN', quantity: 10, reason: 'Initial stock - supplier delivery', reference: 'GRN-001' },
    { productId: products[2].id, type: 'IN', quantity: 8, reason: 'Initial stock - Samsung delivery', reference: 'GRN-002' },
    { productId: products[4].id, type: 'IN', quantity: 50, reason: 'Bulk stock - Samsung A15', reference: 'GRN-003' },
    { productId: products[6].id, type: 'IN', quantity: 30, reason: 'Xiaomi Redmi delivery', reference: 'GRN-004' },
    { productId: products[0].id, type: 'OUT', quantity: 2, reason: 'Sold - retail', reference: 'INV-0005' },
    { productId: products[4].id, type: 'OUT', quantity: 16, reason: 'Wholesale + retail sales', reference: 'INV-0001,INV-0004' },
    { productId: products[6].id, type: 'OUT', quantity: 5, reason: 'Retail sales', reference: '' },
    { productId: products[10].id, type: 'IN', quantity: 5, reason: 'MacBook Air delivery', reference: 'GRN-005' },
    { productId: products[22].id, type: 'IN', quantity: 20, reason: 'AirPods delivery', reference: 'GRN-006' },
    { productId: products[22].id, type: 'OUT', quantity: 5, reason: 'Retail sales', reference: 'INV-0002' },
    { productId: products[29].id, type: 'ADJUSTMENT', quantity: -2, reason: 'Damaged in transit - written off', reference: '' },
  ];

  for (const movement of stockMovements) {
    await prisma.stockMovement.create({
      data: {
        ...movement,
        shopId: shop.id,
      },
    });
  }
  console.log(`   ✅ Created ${stockMovements.length} stock movements`);

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n========================================');
  console.log('🎉 Seed completed successfully!');
  console.log('========================================');
  console.log(`\n📊 Summary:`);
  console.log(`   🏪 Shop: ${shop.name}`);
  console.log(`   👤 Users: 4 (1 Admin, 2 Cashiers, 1 Inactive)`);
  console.log(`   📂 Categories: ${categoriesData.length}`);
  console.log(`   🏷️  Brands: ${brandsData.length}`);
  console.log(`   📦 Products: ${productsData.length}`);
  console.log(`   🎨 Variants: ${totalVariants}`);
  console.log(`   👥 Customers: ${customersData.length}`);
  console.log(`   🏭 Suppliers: ${suppliersData.length}`);
  console.log(`   🧾 Invoices: 8`);
  console.log(`   📊 Stock Movements: ${stockMovements.length}`);
  console.log(`\n🔐 Login Credentials:`);
  console.log(`   ┌──────────────────────────────────────────────┐`);
  console.log(`   │ Admin:    admin@ultrasmart.lk   / Admin@123   │`);
  console.log(`   │ Cashier:  cashier@ultrasmart.lk / Cashier@123 │`);
  console.log(`   │ Cashier2: nimal@ultrasmart.lk   / Staff@123   │`);
  console.log(`   └──────────────────────────────────────────────┘\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
