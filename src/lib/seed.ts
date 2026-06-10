import { collection, getDocs, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

const CATEGORIES = [
  { name: 'Sedas', color: '#8BE04E' },
  { name: 'Fumo', color: '#FF7A1A' },
  { name: 'Piteiras', color: '#7C5CFF' },
  { name: 'Isqueiros', color: '#FFC53D' },
  { name: 'Dichavadores', color: '#FF4D4D' },
  { name: 'Bongs/Pipes', color: '#4DCFFF' },
  { name: 'Narguilé', color: '#E04EBE' },
  { name: 'Incensos', color: '#9DFF6B' },
  { name: 'Vaporizadores', color: '#5CE0FF' },
  { name: 'Acessórios', color: '#FFAA4D' },
];

const PRODUCTS_TEMPLATE = [
  { name: 'Seda Raw Classic King Size', category: 'Sedas', brand: 'RAW', costPrice: 3.5, salePrice: 8.0, stockQty: 80, minStock: 20 },
  { name: 'Seda OCB Slim', category: 'Sedas', brand: 'OCB', costPrice: 2.5, salePrice: 6.0, stockQty: 5, minStock: 15 },
  { name: 'Fumo Virginia Blend 25g', category: 'Fumo', brand: 'Mac Baren', costPrice: 22.0, salePrice: 45.0, stockQty: 30, minStock: 10 },
  { name: 'Piteira de Vidro Chillum', category: 'Piteiras', brand: 'Blaze', costPrice: 8.0, salePrice: 18.0, stockQty: 0, minStock: 5 },
  { name: 'Dichavador Metálico 4 partes', category: 'Dichavadores', brand: 'Space Case', costPrice: 35.0, salePrice: 75.0, stockQty: 12, minStock: 3 },
  { name: 'Isqueiro Clipper Grande', category: 'Isqueiros', brand: 'Clipper', costPrice: 4.0, salePrice: 9.5, stockQty: 50, minStock: 20 },
  { name: 'Bong Acrílico 30cm', category: 'Bongs/Pipes', brand: 'HiQ', costPrice: 45.0, salePrice: 99.0, stockQty: 8, minStock: 2 },
  { name: 'Mangue para Narguilé Silicone', category: 'Narguilé', brand: 'Karma', costPrice: 18.0, salePrice: 39.0, stockQty: 3, minStock: 5 },
  { name: 'Incenso Nag Champa 15un', category: 'Incensos', brand: 'Satya', costPrice: 5.0, salePrice: 12.0, stockQty: 25, minStock: 10 },
  { name: 'Vaporizador PAX 3', category: 'Vaporizadores', brand: 'PAX', costPrice: 380.0, salePrice: 699.0, stockQty: 4, minStock: 1 },
  { name: 'Grinder de Madeira', category: 'Dichavadores', brand: 'Generic', costPrice: 12.0, salePrice: 28.0, stockQty: 18, minStock: 5 },
  { name: 'Kit Limpeza Bong', category: 'Acessórios', brand: 'Formula 420', costPrice: 15.0, salePrice: 32.0, stockQty: 2, minStock: 3 },
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(randomInt(9, 20), randomInt(0, 59), 0, 0);
  return d;
}

export async function seedDatabase(userId: string) {
  // Check if already seeded
  const existing = await getDocs(collection(db, 'products'));
  if (existing.size > 0) {
    alert('Dados de exemplo já foram adicionados!');
    return;
  }

  const batch = writeBatch(db);

  // Create categories
  for (const cat of CATEGORIES) {
    const ref = doc(collection(db, 'categories'));
    batch.set(ref, cat);
  }

  // Create products
  const productIds: string[] = [];
  const productData = PRODUCTS_TEMPLATE.map(p => ({
    ...p,
    sku: `SKU${String(Math.random()).slice(2, 8)}`,
    active: true,
    imageUrl: '',
  }));

  for (const p of productData) {
    const ref = doc(collection(db, 'products'));
    productIds.push(ref.id);
    batch.set(ref, {
      ...p,
      createdAt: Timestamp.fromDate(daysAgo(60)),
      updatedAt: Timestamp.fromDate(daysAgo(1)),
    });
  }

  await batch.commit();

  // Create sales
  const PAYMENT_METHODS = ['dinheiro', 'pix', 'debito', 'credito'];
  const salesBatch = writeBatch(db);

  for (let i = 0; i < 30; i++) {
    const numItems = randomInt(1, 3);
    const items = [];
    for (let j = 0; j < numItems; j++) {
      const pidx = randomInt(0, productData.length - 1);
      const p = productData[pidx];
      const qty = randomInt(1, 3);
      items.push({
        productId: productIds[pidx],
        name: p.name,
        qty,
        unitPrice: p.salePrice,
      });
    }
    const total = items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
    const saleRef = doc(collection(db, 'sales'));
    salesBatch.set(saleRef, {
      items,
      total,
      paymentMethod: PAYMENT_METHODS[randomInt(0, 3)],
      createdAt: Timestamp.fromDate(daysAgo(randomInt(0, 29))),
      userId,
    });
  }

  await salesBatch.commit();
  alert('Dados de exemplo adicionados com sucesso!');
}
