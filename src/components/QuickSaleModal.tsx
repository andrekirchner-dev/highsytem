import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, X, CheckCircle, Loader2, ShoppingCart } from 'lucide-react';
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

interface Props {
  onClose: () => void;
}

export default function QuickSaleModal({ onClose }: Props) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { return subscribeProducts(setProducts); }, []);

  const results = search.length >= 1
    ? products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku?.toLowerCase().includes(search.toLowerCase()) ?? false)
      ).slice(0, 6)
    : [];

  function addToCart(product: Product) {
    if (product.stockQty === 0) return;
    setCart(prev => {
      const ex = prev.find(c => c.product.id === product.id);
      if (ex) {
        if (ex.qty >= product.stockQty) return prev;
        return prev.map(c => c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { product, qty: 1 }];
    });
    setSearch('');
  }

  function updateQty(id: string, delta: number) {
    setCart(prev => prev
      .map(c => c.product.id !== id ? c : { ...c, qty: Math.max(0, Math.min(c.qty + delta, c.product.stockQty)) })
      .filter(c => c.qty > 0)
    );
  }

  const total = cart.reduce((s, c) => s + c.product.salePrice * c.qty, 0);

  async function handleFinalize() {
    if (!cart.length || !user) return;
    setLoading(true);
    try {
      await createSale(cart, payment, user.uid);
      setDone(true);
      setCart([]);
      setTimeout(onClose, 1800);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao registrar venda');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="glass rounded-2xl w-full max-w-lg border border-border flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-primary" />
            <span className="font-display font-semibold text-text">Realizar venda</span>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 px-6">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle size={28} className="text-primary" />
            </div>
            <p className="font-display font-bold text-text text-lg">Venda registrada!</p>
            <p className="text-text-muted text-sm">{formatCurrency(total || 0)}</p>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="px-5 pt-4 pb-3 flex-shrink-0">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar produto pelo nome ou SKU..."
                  className="w-full bg-surface-2 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>

              {/* Search results */}
              {results.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {results.map(p => (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={p.stockQty === 0}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-all',
                        p.stockQty === 0
                          ? 'opacity-40 cursor-not-allowed border-border bg-surface-2/50'
                          : 'border-border bg-surface-2 hover:border-primary/40 hover:bg-surface-2'
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium text-text">{p.name}</p>
                        <p className="text-xs text-text-muted">{p.category} · <span className="font-mono-data">{p.stockQty}</span> un</p>
                      </div>
                      <p className="font-mono-data text-primary font-bold text-sm">{formatCurrency(p.salePrice)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart */}
            <div className="flex-1 overflow-y-auto scrollbar-thin px-5 space-y-2 min-h-[80px]">
              {cart.length === 0 ? (
                <p className="text-center text-text-muted text-sm py-4">Busque um produto para adicionar</p>
              ) : cart.map(({ product, qty }) => (
                <div key={product.id} className="flex items-center gap-3 bg-surface-2 rounded-xl px-3 py-2.5 border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{product.name}</p>
                    <p className="text-xs text-text-muted font-mono-data">{formatCurrency(product.salePrice)} × {qty}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(product.id, -1)}
                      className="w-6 h-6 rounded-lg bg-surface border border-border text-text-muted hover:text-text flex items-center justify-center">
                      <Minus size={10} />
                    </button>
                    <span className="font-mono-data text-sm text-text w-5 text-center">{qty}</span>
                    <button onClick={() => updateQty(product.id, +1)}
                      className="w-6 h-6 rounded-lg bg-surface border border-border text-text-muted hover:text-text flex items-center justify-center">
                      <Plus size={10} />
                    </button>
                  </div>
                  <p className="font-mono-data font-bold text-text text-sm w-16 text-right">{formatCurrency(product.salePrice * qty)}</p>
                  <button onClick={() => updateQty(product.id, -qty)} className="text-text-muted hover:text-danger">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border flex-shrink-0 space-y-3">
              {/* Payment */}
              <div className="grid grid-cols-4 gap-1.5">
                {PAYMENT_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setPayment(opt.value)}
                    className={cn(
                      'flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs border transition-all',
                      payment === opt.value
                        ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                        : 'bg-surface-2 border-border text-text-muted hover:text-text'
                    )}>
                    <span className="text-base">{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Total + finalize */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-text-muted">Total</p>
                  <p className="font-mono-data text-2xl font-bold text-primary">{formatCurrency(total)}</p>
                </div>
                <button
                  onClick={handleFinalize}
                  disabled={loading || cart.length === 0}
                  className="flex-1 bg-primary text-bg font-bold py-3.5 rounded-xl hover:bg-primary-glow transition-all glow-primary flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Finalizar</>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
