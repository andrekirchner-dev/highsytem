import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/firestore BEFORE any imports that use it
vi.mock('firebase/firestore', () => {
  const onSnapshotMock = vi.fn();
  const runTransactionMock = vi.fn();
  const addDocMock = vi.fn();
  const updateDocMock = vi.fn();
  const serverTimestampMock = vi.fn(() => ({ _type: 'serverTimestamp' }));
  const TimestampMock = {
    fromDate: vi.fn((d: Date) => ({ toDate: () => d, seconds: Math.floor(d.getTime() / 1000) })),
  };

  return {
    collection: vi.fn((_db: unknown, path: string) => ({ path })),
    doc: vi.fn((_db: unknown, path: string, id?: string) => ({ path, id })),
    query: vi.fn((...args: unknown[]) => args[0]),
    where: vi.fn(),
    orderBy: vi.fn(),
    onSnapshot: onSnapshotMock,
    runTransaction: runTransactionMock,
    addDoc: addDocMock,
    updateDoc: updateDocMock,
    getDocs: vi.fn(),
    serverTimestamp: serverTimestampMock,
    Timestamp: TimestampMock,
  };
});

import { createSale, adjustStock, subscribeProducts, subscribeSales } from '../firestore';
import {
  runTransaction, onSnapshot, addDoc, updateDoc, Timestamp,
} from 'firebase/firestore';
import type { CartItem } from '../../types';

// Fixture helpers
function makeProduct(overrides: Partial<{ id: string; stockQty: number; name: string; salePrice: number }> = {}) {
  return {
    id: 'prod-1',
    name: 'Produto Teste',
    category: 'Cat',
    brand: 'Marca',
    costPrice: 10,
    salePrice: 25,
    stockQty: 5,
    minStock: 2,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeCartItem(overrides: Partial<{ qty: number; stockQty: number }> = {}): CartItem {
  const product = makeProduct({ stockQty: overrides.stockQty ?? 5 });
  return { product, qty: overrides.qty ?? 1 };
}

// Helper to build a fake Firestore transaction object
function makeFakeTx(productSnapData: Record<string, unknown> = { stockQty: 5 }) {
  const sets: unknown[] = [];
  const updates: unknown[] = [];
  return {
    get: vi.fn().mockResolvedValue({
      exists: () => true,
      data: () => productSnapData,
    }),
    set: vi.fn((_ref: unknown, data: unknown) => sets.push(data)),
    update: vi.fn((_ref: unknown, data: unknown) => updates.push(data)),
    _sets: sets,
    _updates: updates,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createSale', () => {
  it('calls runTransaction once per sale', async () => {
    const fakeTx = makeFakeTx();
    vi.mocked(runTransaction).mockImplementation(async (_db, fn) => {
      await fn(fakeTx as never);
      return undefined;
    });
    vi.mocked(addDoc).mockResolvedValue({ id: 'sale-abc' } as never);

    const items = [makeCartItem({ qty: 2, stockQty: 5 })];
    await createSale(items, 'pix', 'user-1');

    expect(runTransaction).toHaveBeenCalledOnce();
  });

  it('decrements stock by the correct quantity inside the transaction', async () => {
    const fakeTx = makeFakeTx({ stockQty: 10 });
    vi.mocked(runTransaction).mockImplementation(async (_db, fn) => {
      await fn(fakeTx as never);
      return undefined;
    });

    const items = [makeCartItem({ qty: 3, stockQty: 10 })];
    await createSale(items, 'dinheiro', 'user-1');

    // The transaction should call update with stockQty: 10 - 3 = 7
    const updateCalls = vi.mocked(fakeTx.update).mock.calls;
    const stockUpdate = updateCalls.find(([, data]) =>
      (data as Record<string, unknown>).stockQty === 7
    );
    expect(stockUpdate).toBeDefined();
  });

  it('throws when stockQty is insufficient', async () => {
    const fakeTx = makeFakeTx({ stockQty: 1 });
    vi.mocked(runTransaction).mockImplementation(async (_db, fn) => {
      await fn(fakeTx as never);
      return undefined;
    });

    const items = [makeCartItem({ qty: 5, stockQty: 1 })];
    await expect(createSale(items, 'pix', 'user-1')).rejects.toThrow('Estoque insuficiente');
  });

  it('throws when a product doc does not exist', async () => {
    const fakeTx = {
      get: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
      set: vi.fn(),
      update: vi.fn(),
    };
    vi.mocked(runTransaction).mockImplementation(async (_db, fn) => {
      await fn(fakeTx as never);
      return undefined;
    });

    const items = [makeCartItem()];
    await expect(createSale(items, 'pix', 'user-1')).rejects.toThrow('não encontrado');
  });

  it('writes a sale document and one movement per item inside the transaction', async () => {
    const fakeTx = makeFakeTx({ stockQty: 10 });
    vi.mocked(runTransaction).mockImplementation(async (_db, fn) => {
      await fn(fakeTx as never);
      return undefined;
    });

    const items = [
      makeCartItem({ qty: 1, stockQty: 10 }),
      { product: makeProduct({ id: 'prod-2', stockQty: 10 }), qty: 2 },
    ];
    await createSale(items, 'credito', 'user-1');

    // set() should be called: 1 sale doc + 2 movement docs = 3 times
    expect(fakeTx.set).toHaveBeenCalledTimes(3);
  });

  it('calculates the total correctly from item prices and quantities', async () => {
    const fakeTx = makeFakeTx({ stockQty: 10 });
    let capturedSaleData: Record<string, unknown> | null = null;
    vi.mocked(runTransaction).mockImplementation(async (_db, fn) => {
      fakeTx.set.mockImplementationOnce((_ref: unknown, data: unknown) => {
        capturedSaleData = data as Record<string, unknown>;
      });
      await fn(fakeTx as never);
      return undefined;
    });

    const items = [
      { product: makeProduct({ salePrice: 25 }), qty: 2 },   // 50
      { product: makeProduct({ id: 'prod-2', salePrice: 10, stockQty: 10 }), qty: 3 }, // 30
    ];
    await createSale(items, 'pix', 'user-1');

    expect(capturedSaleData?.total).toBe(80);
  });
});

describe('adjustStock', () => {
  it('increments stock when delta is positive', async () => {
    const fakeTx = makeFakeTx({ stockQty: 5 });
    vi.mocked(runTransaction).mockImplementation(async (_db, fn) => {
      await fn(fakeTx as never);
      return undefined;
    });
    vi.mocked(addDoc).mockResolvedValue({ id: 'mov-1' } as never);

    await adjustStock('prod-1', 3, 'Reposição', 'user-1');

    const updateCalls = vi.mocked(fakeTx.update).mock.calls;
    const stockUpdate = updateCalls.find(([, data]) =>
      (data as Record<string, unknown>).stockQty === 8
    );
    expect(stockUpdate).toBeDefined();
    expect(addDoc).toHaveBeenCalledOnce();
  });

  it('throws when resulting stock would be negative', async () => {
    const fakeTx = makeFakeTx({ stockQty: 2 });
    vi.mocked(runTransaction).mockImplementation(async (_db, fn) => {
      await fn(fakeTx as never);
      return undefined;
    });

    await expect(adjustStock('prod-1', -5, 'Ajuste', 'user-1')).rejects.toThrow('Estoque insuficiente');
  });
});

describe('subscribeProducts', () => {
  it('calls the callback with mapped products from the snapshot', () => {
    const fakeProducts = [
      { id: 'p1', data: () => ({ name: 'Narguilé', active: true, stockQty: 3, salePrice: 100 }) },
    ];
    vi.mocked(onSnapshot).mockImplementation((_q, cb: unknown) => {
      (cb as (s: unknown) => void)({ docs: fakeProducts });
      return vi.fn();
    });

    const callback = vi.fn();
    subscribeProducts(callback);

    expect(callback).toHaveBeenCalledOnce();
    expect(callback.mock.calls[0][0][0]).toMatchObject({ id: 'p1', name: 'Narguilé' });
  });

  it('returns an unsubscribe function', () => {
    const unsub = vi.fn();
    vi.mocked(onSnapshot).mockReturnValue(unsub);
    const result = subscribeProducts(vi.fn());
    expect(result).toBe(unsub);
  });
});

describe('subscribeSales', () => {
  it('converts Firestore Timestamp to JS Date', () => {
    const fakeDate = new Date('2025-06-01T10:00:00');
    const fakeTimestamp = (Timestamp as { fromDate: (d: Date) => unknown }).fromDate(fakeDate);
    const fakeSales = [
      {
        id: 's1',
        data: () => ({
          items: [],
          total: 50,
          paymentMethod: 'pix',
          createdAt: fakeTimestamp,
          userId: 'u1',
        }),
      },
    ];
    vi.mocked(onSnapshot).mockImplementation((_q, cb: unknown) => {
      (cb as (s: unknown) => void)({ docs: fakeSales });
      return vi.fn();
    });

    const callback = vi.fn();
    subscribeSales(callback, 30);

    expect(callback).toHaveBeenCalledOnce();
    const sale = callback.mock.calls[0][0][0];
    expect(sale.createdAt).toBeInstanceOf(Date);
  });
});
