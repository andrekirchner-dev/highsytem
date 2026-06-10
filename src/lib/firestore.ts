import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, runTransaction,
  serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Product, Sale, Category, PaymentMethod, CartItem } from '../types';

// --- Products ---
export function subscribeProducts(cb: (products: Product[]) => void) {
  const q = query(collection(db, 'products'), where('active', '==', true), orderBy('name'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
  });
}

export function subscribeAllProducts(cb: (products: Product[]) => void) {
  const q = query(collection(db, 'products'), orderBy('name'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
  });
}

export async function getAllProducts(): Promise<Product[]> {
  const q = query(collection(db, 'products'), orderBy('name'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
}

export async function createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
  return addDoc(collection(db, 'products'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProduct(id: string, data: Partial<Product>) {
  return updateDoc(doc(db, 'products', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deactivateProduct(id: string) {
  return updateDoc(doc(db, 'products', id), { active: false, updatedAt: serverTimestamp() });
}

export async function adjustStock(
  productId: string,
  delta: number,
  reason: string,
  userId: string
) {
  const ref = doc(db, 'products', productId);
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Produto não encontrado');
    const current = (snap.data().stockQty as number) || 0;
    const next = current + delta;
    if (next < 0) throw new Error('Estoque insuficiente');
    tx.update(ref, { stockQty: next, updatedAt: serverTimestamp() });
  });
  await addDoc(collection(db, 'stockMovements'), {
    productId,
    type: delta > 0 ? 'entrada' : 'ajuste',
    qty: Math.abs(delta),
    reason,
    createdAt: serverTimestamp(),
    userId,
  });
}

// --- Sales ---
export async function createSale(
  items: CartItem[],
  paymentMethod: PaymentMethod,
  userId: string
): Promise<string> {
  const saleItems = items.map(ci => ({
    productId: ci.product.id,
    name: ci.product.name,
    qty: ci.qty,
    unitPrice: ci.product.salePrice,
  }));
  const total = saleItems.reduce((s, i) => s + i.unitPrice * i.qty, 0);

  let saleId = '';
  await runTransaction(db, async tx => {
    // Check & decrement stock for each item
    for (const ci of items) {
      const ref = doc(db, 'products', ci.product.id);
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error(`Produto ${ci.product.name} não encontrado`);
      const current = (snap.data().stockQty as number) || 0;
      if (current < ci.qty) throw new Error(`Estoque insuficiente para ${ci.product.name}`);
      tx.update(ref, { stockQty: current - ci.qty, updatedAt: serverTimestamp() });
    }
    // Create sale doc
    const saleRef = doc(collection(db, 'sales'));
    saleId = saleRef.id;
    tx.set(saleRef, {
      items: saleItems,
      total,
      paymentMethod,
      createdAt: serverTimestamp(),
      userId,
    });
    // Create movements
    for (const ci of items) {
      const movRef = doc(collection(db, 'stockMovements'));
      tx.set(movRef, {
        productId: ci.product.id,
        type: 'venda',
        qty: ci.qty,
        reason: `Venda registrada`,
        createdAt: serverTimestamp(),
        userId,
      });
    }
  });
  return saleId;
}

export function subscribeSales(cb: (sales: Sale[]) => void, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const q = query(
    collection(db, 'sales'),
    where('createdAt', '>=', Timestamp.fromDate(since)),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
      } as Sale;
    }));
  });
}

export async function getSalesByPeriod(from: Date, to: Date): Promise<Sale[]> {
  const q = query(
    collection(db, 'sales'),
    where('createdAt', '>=', Timestamp.fromDate(from)),
    where('createdAt', '<=', Timestamp.fromDate(to)),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, createdAt: (data.createdAt as Timestamp)?.toDate() || new Date() } as Sale;
  });
}

// --- Categories ---
export function subscribeCategories(cb: (cats: Category[]) => void) {
  return onSnapshot(collection(db, 'categories'), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
  });
}

export async function createCategory(name: string, color: string) {
  return addDoc(collection(db, 'categories'), { name, color });
}

export async function updateCategory(id: string, name: string, color: string) {
  return updateDoc(doc(db, 'categories', id), { name, color });
}

export async function deleteCategory(id: string) {
  return deleteDoc(doc(db, 'categories', id));
}
