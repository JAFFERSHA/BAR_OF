import { PrismaClient, Role, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Passw0rd!', 10);

  const [owner, manager, staff] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'owner@bar.test' },
      update: {},
      create: { name: 'Rajesh Kumar', email: 'owner@bar.test', phone: '+919876543210', password, role: Role.OWNER }
    }),
    prisma.user.upsert({
      where: { email: 'manager@bar.test' },
      update: {},
      create: { name: 'Priya Sharma', email: 'manager@bar.test', phone: '+919876543211', password, role: Role.MANAGER }
    }),
    prisma.user.upsert({
      where: { email: 'staff@bar.test' },
      update: {},
      create: { name: 'Amit Patel', email: 'staff@bar.test', phone: '+919876543212', password, role: Role.STAFF }
    })
  ]);

  // Suppliers
  const [supplierA, supplierB] = await Promise.all([
    prisma.supplier.upsert({
      where: { name: 'United Breweries Ltd' },
      update: {},
      create: { name: 'United Breweries Ltd', contact: 'Vikram Singh', email: 'orders@ub.co.in', phone: '+914023456789' }
    }),
    prisma.supplier.upsert({
      where: { name: 'Pernod Ricard India' },
      update: {},
      create: { name: 'Pernod Ricard India', contact: 'Suresh Nair', email: 'supply@pernod.in', phone: '+912234567890' }
    }),
  ]);

  // Products (realistic bar inventory)
  await prisma.product.createMany({
    data: [
      { name: 'Kingfisher Premium Lager', sku: 'KF-PRM-650', unit: 'bottle', costPrice: 90, salePrice: 180, quantity: 144, reorderLevel: 48 },
      { name: 'Bira White', sku: 'BIRA-WHT-330', unit: 'can', costPrice: 75, salePrice: 150, quantity: 72, reorderLevel: 24 },
      { name: 'Tuborg Strong', sku: 'TBG-STR-650', unit: 'bottle', costPrice: 95, salePrice: 190, quantity: 96, reorderLevel: 36 },
      { name: 'Blenders Pride Whisky', sku: 'BP-WHK-750', unit: 'bottle', costPrice: 480, salePrice: 850, quantity: 18, reorderLevel: 6 },
      { name: 'Royal Stag', sku: 'RS-WHK-750', unit: 'bottle', costPrice: 350, salePrice: 650, quantity: 24, reorderLevel: 8 },
      { name: 'Old Monk Rum', sku: 'OM-RUM-750', unit: 'bottle', costPrice: 280, salePrice: 520, quantity: 12, reorderLevel: 6 },
      { name: 'Magic Moments Vodka', sku: 'MM-VDK-750', unit: 'bottle', costPrice: 320, salePrice: 600, quantity: 15, reorderLevel: 5 },
      { name: 'Sula Sauvignon Blanc', sku: 'SULA-SB-750', unit: 'bottle', costPrice: 450, salePrice: 900, quantity: 8, reorderLevel: 4 },
      { name: 'Coca-Cola', sku: 'COKE-300', unit: 'bottle', costPrice: 20, salePrice: 60, quantity: 200, reorderLevel: 60 },
      { name: 'Tonic Water Schweppes', sku: 'SCH-TW-300', unit: 'bottle', costPrice: 35, salePrice: 80, quantity: 48, reorderLevel: 18 },
      { name: 'Red Bull Energy', sku: 'RB-250', unit: 'can', costPrice: 85, salePrice: 180, quantity: 36, reorderLevel: 12 },
      { name: 'Budweiser', sku: 'BUD-330', unit: 'bottle', costPrice: 80, salePrice: 160, quantity: 5, reorderLevel: 24 },
    ],
    skipDuplicates: true
  });

  // Fetch products for creating purchases and sales
  const allProducts = await prisma.product.findMany();
  const kf = allProducts.find(p => p.sku === 'KF-PRM-650')!;
  const bp = allProducts.find(p => p.sku === 'BP-WHK-750')!;
  const om = allProducts.find(p => p.sku === 'OM-RUM-750')!;
  const coke = allProducts.find(p => p.sku === 'COKE-300')!;
  const bira = allProducts.find(p => p.sku === 'BIRA-WHT-330')!;
  const bud = allProducts.find(p => p.sku === 'BUD-330')!;

  // Sample purchases
  await prisma.purchase.create({
    data: {
      userId: manager.id,
      supplierId: supplierA.id,
      total: 144 * 90 + 48 * 75,
      items: {
        create: [
          { productId: kf.id, quantity: 144, costPrice: 90 },
          { productId: bira.id, quantity: 48, costPrice: 75 },
        ]
      }
    }
  });

  await prisma.purchase.create({
    data: {
      userId: owner.id,
      supplierId: supplierB.id,
      total: 12 * 480 + 12 * 280,
      items: {
        create: [
          { productId: bp.id, quantity: 12, costPrice: 480 },
          { productId: om.id, quantity: 12, costPrice: 280 },
        ]
      }
    }
  });

  // Sample sales
  await prisma.sale.create({
    data: {
      customer: 'Rahul Verma',
      subtotal: 2 * 180 + 1 * 850 + 2 * 60,
      tax: (2 * 180 + 1 * 850 + 2 * 60) * 0.05,
      total: (2 * 180 + 1 * 850 + 2 * 60) * 1.05,
      userId: staff.id,
      items: {
        create: [
          { productId: kf.id, quantity: 2, unitPrice: 180 },
          { productId: bp.id, quantity: 1, unitPrice: 850 },
          { productId: coke.id, quantity: 2, unitPrice: 60 },
        ]
      }
    }
  });

  await prisma.sale.create({
    data: {
      customer: 'Walk-in',
      subtotal: 3 * 150 + 2 * 180,
      tax: (3 * 150 + 2 * 180) * 0.05,
      total: (3 * 150 + 2 * 180) * 1.05,
      userId: staff.id,
      items: {
        create: [
          { productId: bira.id, quantity: 3, unitPrice: 150 },
          { productId: coke.id, quantity: 2, unitPrice: 60 },
        ]
      }
    }
  });

  await prisma.sale.create({
    data: {
      customer: 'Meera Reddy',
      subtotal: 1 * 520 + 1 * 600 + 3 * 80,
      tax: (1 * 520 + 1 * 600 + 3 * 80) * 0.05,
      total: (1 * 520 + 1 * 600 + 3 * 80) * 1.05,
      userId: manager.id,
      items: {
        create: [
          { productId: om.id, quantity: 1, unitPrice: 520 },
          { productId: allProducts.find(p => p.sku === 'MM-VDK-750')!.id, quantity: 1, unitPrice: 600 },
        ]
      }
    }
  });

  // Sample notifications
  await Promise.all([
    prisma.notification.create({
      data: { message: 'Budweiser fell below reorder level (5/24)', type: NotificationType.STOCK_LOW, userId: owner.id, relatedProductId: bud.id }
    }),
    prisma.notification.create({
      data: { message: 'Budweiser fell below reorder level (5/24)', type: NotificationType.STOCK_LOW, userId: manager.id, relatedProductId: bud.id }
    }),
    prisma.notification.create({
      data: { message: 'Purchase logged for 2 items', type: NotificationType.PURCHASE_LOGGED, userId: owner.id }
    }),
    prisma.notification.create({
      data: { message: 'Bill issued for Rahul Verma - 1417.50', type: NotificationType.SALE_BILL, userId: owner.id }
    }),
    prisma.notification.create({
      data: { message: 'Bill issued for Rahul Verma - 1417.50', type: NotificationType.SALE_BILL, userId: manager.id }
    }),
  ]);

  // Currency setting
  await prisma.setting.upsert({
    where: { key: 'currency' },
    update: { value: '₹' },
    create: { key: 'currency', value: '₹' }
  });

  console.log('Seed complete with realistic bar data');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
