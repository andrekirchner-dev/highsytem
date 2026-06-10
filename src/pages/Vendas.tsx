import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle, Loader2 } from 'lucide-react';
import { subscribeProducts, createSale } from '../lib/firestore';
import type { Product, CartItem, PaymentMethod } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
  { value: 'pix', label: 'PIX', icon: '📱' },
  { value: 'debito', label: 'Débito', icon: '💳' },
  { value: 'credito', label: 'Crédito', icon: '💳' },
];

export default function Vendas() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    return subscribeProducts(setProducts);
  }, []);

  const results = search.length >= 1
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  function addToCart(product: Product) {
    if (product.stockQty === 0) return;
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stockQty) return prev;
        return prev.map(c => c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { product, qty: 1 }];
    });
    setSearch('');
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev =>
      prev
        .map(c => {
          if (c.product.id !== productId) return c;
          const next = c.qty + delta;
          if (next <= 0) return null as unknown as CartItem;
          if (next > c.product.stockQty) return c;
          return { ...c, qty: next };
        })
        .filter(Boolean)
    );
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  }

  const total = cart.reduce((s, c) => s + c.product.salePrice * c.qty, 0);

  async function handleFinalize() {
    if (cart.length === 0 || !user) return;
    setLoading(true);
    try {
      await createSale(cart, payment, user.uid);
      setCart([]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao registrar venda');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold text-text">PDV — Vendas</h1>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        {/* Product search */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <h2 className="font-display font-semibold text-text mb-4">Buscar produto</h2>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Nome ou SKU do produto..."
                className="w-full bg-surface-2 border border-border rounded-xl pl-9 pr-4 py-3 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>
            {results.length > 0 && (
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                {results.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={p.stockQty === 0}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all',
                      p.stockQty === 0
                        ? 'border-border bg-surface-2/50 opacity-50 cursor-not-allowed'
                        : 'border-border bg-surface-2 hover:border-primary/40'
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-text">{p.name}</p>
                      <p className="text-xs text-text-muted">
                        {p.category} · estoque: <span className="font-mono-data">{p.stockQty}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono-data text-primary font-bold">{formatCurrency(p.salePrice)}</p>
                      {p.stockQty === 0 && <p className="text-xs text-danger">Sem estoque</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart */}
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            <h2 className="font-display font-semibold text-text">Carrinho</h2>
            {cart.length > 0 && (
              <span className="bg-primary/20 text-primary text-xs font-mono-data px-2 py-0.5 rounded-full">
                {cart.length}
              </span>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm">
              <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
              Carrinho vazio
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                {cart.map(({ product, qty }) => (
                  <div key={product.id} className="flex items-center gap-3 p-3 bg-surface-2 rounded-xl border border-border">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{product.name}</p>
                      <p className="text-xs text-text-muted font-mono-data">
                        {formatCurrency(product.salePrice)} × {qty}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(product.id, -1)}
                        className="w-7 h-7 rounded-lg bg-surface border border-border text-text-muted hover:text-text flex items-center justify-center">
                        <Minus size={12} />
                      </button>
                      <span className="font-mono-data text-sm text-text w-6 text-center">{qty}</span>
                      <button onClick={() => updateQty(product.id, +1)}
                        className="w-7 h-7 rounded-lg bg-surface border border-border text-text-muted hover:text-text flex items-center justify-center">
                        <Plus size={12} />
                      </button>
                      <button onClick={() => removeFromCart(product.id)}
                        className="text-text-muted hover:text-danger transition-colors ml-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="font-mono-data font-bold text-text text-sm w-20 text-right">
                      {formatCurrency(product.salePrice * qty)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-text-muted text-sm">Total</span>
                  <span className="font-mono-data text-3xl font-bold text-primary">{formatCurrency(total)}</span>
                </div>

                {/* Payment method */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {PAYMENT_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setPayment(opt.value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all',
                        payment === opt.value
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-surface-2 border-border text-text-muted hover:text-text'
                      )}>
                      <span>{opt.icon}</span> {opt.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleFinalize}
                  disabled={loading || cart.length === 0}
                  className="w-full bg-primary text-bg font-bold py-4 rounded-xl text-lg hover:bg-primary-glow transition-all glow-primary flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading
                    ? <Loader2 size={20} className="animate-spin" />
                    : success
                      ? <><CheckCircle size={20} /> Venda registrada!</>
                      : 'Finalizar venda'
                  }
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
