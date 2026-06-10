import { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart,
  CheckCircle, Loader2, X, Tag, ChevronDown, Receipt,
} from 'lucide-react';
import { subscribeProducts, subscribeCategories, subscribeSales, createSale } from '../lib/firestore';
import type { Product, CartItem, PaymentMethod, Category, Sale } from '../types';
import { formatCurrency, formatDateTime, cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
  { value: 'pix', label: 'PIX', icon: '📱' },
  { value: 'debito', label: 'Débito', icon: '💳' },
  { value: 'credito', label: 'Crédito', icon: '💳' },
];

interface SaleSummary {
  items: CartItem[];
  total: number;
  discount: number;
  finalTotal: number;
  payment: PaymentMethod;
  change: number;
  date: Date;
}

export default function Vendas() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState<PaymentMethod>('pix');
  const [discount, setDiscount] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<SaleSummary | null>(null);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u1 = subscribeProducts(setProducts);
    const u2 = subscribeCategories(setCategories);
    const u3 = subscribeSales(setSales, 50);
    return () => { u1(); u2(); u3(); };
  }, []);

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchCat = activeCategory === 'Todos' || p.category === activeCategory;
    return matchSearch && matchCat;
  });

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
  }

  function setQty(productId: string, qty: number) {
    if (qty <= 0) { removeFromCart(productId); return; }
    setCart(prev => prev.map(c => {
      if (c.product.id !== productId) return c;
      return { ...c, qty: Math.min(qty, c.product.stockQty) };
    }));
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  }

  const subtotal = cart.reduce((s, c) => s + c.product.salePrice * c.qty, 0);
  const discountValue = Math.min(parseFloat(discount) || 0, subtotal);
  const total = subtotal - discountValue;
  const change = payment === 'dinheiro' ? Math.max((parseFloat(cashReceived) || 0) - total, 0) : 0;

  async function handleFinalize() {
    if (cart.length === 0 || !user) return;
    setLoading(true);
    try {
      await createSale(cart, payment, user.uid);
      setSummary({
        items: [...cart],
        total: subtotal,
        discount: discountValue,
        finalTotal: total,
        payment,
        change,
        date: new Date(),
      });
      setCart([]);
      setDiscount('');
      setCashReceived('');
      setPayment('pix');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Erro ao registrar venda');
    } finally {
      setLoading(false);
    }
  }

  const allCategories = ['Todos', ...categories.map(c => c.name)];

  const PAYMENT_LABELS: Record<PaymentMethod, string> = {
    dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito',
  };

  return (
    <div className="space-y-6">
    <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-14rem)]">

      {/* LEFT — Product catalog */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar produto ou SKU..."
            className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-3 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary transition-colors"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                activeCategory === cat
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-surface border-border text-text-muted hover:text-text'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto scrollbar-thin">
          {filtered.map(p => {
            const inCart = cart.find(c => c.product.id === p.id);
            const outOfStock = p.stockQty === 0;
            return (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={outOfStock}
                className={cn(
                  'glass rounded-2xl p-4 text-left transition-all border flex flex-col gap-2 relative',
                  outOfStock
                    ? 'opacity-40 cursor-not-allowed'
                    : 'glass-hover cursor-pointer',
                  inCart && 'border-primary/40 bg-primary/5'
                )}
              >
                {inCart && (
                  <span className="absolute top-2 right-2 bg-primary text-bg text-[10px] font-bold font-mono-data rounded-full w-5 h-5 flex items-center justify-center">
                    {inCart.qty}
                  </span>
                )}
                <p className="text-xs text-text-muted">{p.category}</p>
                <p className="text-sm font-semibold text-text leading-snug line-clamp-2">{p.name}</p>
                <div className="mt-auto flex items-end justify-between">
                  <p className="font-mono-data text-primary font-bold text-sm">{formatCurrency(p.salePrice)}</p>
                  <p className={cn('text-[10px] font-mono-data', p.stockQty <= p.minStock ? 'text-warning' : 'text-text-muted')}>
                    {outOfStock ? <span className="text-danger">Zerado</span> : `${p.stockQty} un`}
                  </p>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center text-text-muted text-sm">
              Nenhum produto encontrado
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — Cart */}
      <div className="lg:w-80 xl:w-96 flex flex-col gap-0 glass rounded-2xl overflow-hidden">

        {/* Cart header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <ShoppingCart size={18} className="text-primary" />
          <span className="font-display font-semibold text-text">Carrinho</span>
          {cart.length > 0 && (
            <span className="ml-auto bg-primary/20 text-primary text-xs font-mono-data px-2 py-0.5 rounded-full">
              {cart.reduce((s, c) => s + c.qty, 0)} itens
            </span>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-2 min-h-[160px] max-h-[38vh]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 py-10 text-text-muted text-sm">
              <ShoppingCart size={28} className="opacity-20" />
              <span>Carrinho vazio</span>
            </div>
          ) : cart.map(({ product, qty }) => (
            <div key={product.id} className="flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-2.5 border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text truncate">{product.name}</p>
                <p className="text-[11px] text-text-muted font-mono-data">{formatCurrency(product.salePrice)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => setQty(product.id, qty - 1)}
                  className="w-6 h-6 rounded-lg bg-surface border border-border text-text-muted hover:text-text flex items-center justify-center">
                  <Minus size={10} />
                </button>
                <input
                  type="number"
                  min={1}
                  max={product.stockQty}
                  value={qty}
                  onChange={e => setQty(product.id, parseInt(e.target.value) || 1)}
                  className="w-8 text-center bg-transparent text-text text-xs font-mono-data focus:outline-none"
                />
                <button onClick={() => setQty(product.id, qty + 1)}
                  className="w-6 h-6 rounded-lg bg-surface border border-border text-text-muted hover:text-text flex items-center justify-center">
                  <Plus size={10} />
                </button>
              </div>
              <p className="font-mono-data text-xs font-bold text-text w-14 text-right flex-shrink-0">
                {formatCurrency(product.salePrice * qty)}
              </p>
              <button onClick={() => removeFromCart(product.id)} className="text-text-muted hover:text-danger flex-shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Totals + payment */}
        <div className="border-t border-border px-5 py-4 space-y-4">

          {/* Discount */}
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-text-muted flex-shrink-0" />
            <label className="text-xs text-text-muted flex-shrink-0">Desconto (R$)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              placeholder="0,00"
              className="flex-1 bg-surface-2 border border-border rounded-lg px-2 py-1.5 text-right text-xs font-mono-data text-text focus:outline-none focus:border-primary"
            />
          </div>

          {/* Subtotal / discount / total */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-text-muted">
              <span>Subtotal</span>
              <span className="font-mono-data">{formatCurrency(subtotal)}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-warning">
                <span>Desconto</span>
                <span className="font-mono-data">- {formatCurrency(discountValue)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-text border-t border-border pt-2 mt-1">
              <span>Total</span>
              <span className="font-mono-data text-primary text-xl">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setPayment(opt.value)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-2 rounded-xl text-xs border transition-all',
                  payment === opt.value
                    ? 'bg-primary/10 border-primary/30 text-primary font-semibold'
                    : 'bg-surface-2 border-border text-text-muted hover:text-text'
                )}>
                <span>{opt.icon}</span> {opt.label}
              </button>
            ))}
          </div>

          {/* Cash received (dinheiro only) */}
          {payment === 'dinheiro' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-text-muted flex-shrink-0">Recebido (R$)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={cashReceived}
                onChange={e => setCashReceived(e.target.value)}
                placeholder={total.toFixed(2)}
                className="flex-1 bg-surface-2 border border-border rounded-lg px-2 py-1.5 text-right text-xs font-mono-data text-text focus:outline-none focus:border-primary"
              />
              {change > 0 && (
                <span className="text-xs font-mono-data font-bold text-success flex-shrink-0">
                  Troco: {formatCurrency(change)}
                </span>
              )}
            </div>
          )}

          {/* Finalize */}
          <button
            onClick={handleFinalize}
            disabled={loading || cart.length === 0}
            className="w-full bg-primary text-bg font-bold py-3.5 rounded-xl text-sm hover:bg-primary-glow transition-all glow-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading
              ? <Loader2 size={18} className="animate-spin" />
              : <><CheckCircle size={16} /> Finalizar venda</>
            }
          </button>
        </div>
      </div>

    </div>

    {/* SALES HISTORY */}
    <div className="glass rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Receipt size={18} className="text-primary" />
        <h2 className="font-display font-semibold text-text">Histórico de vendas</h2>
        <span className="ml-auto text-xs text-text-muted font-mono-data">{sales.length} registros</span>
      </div>

      {sales.length === 0 ? (
        <div className="py-12 text-center text-text-muted text-sm">Nenhuma venda registrada ainda</div>
      ) : (
        <div className="divide-y divide-border">
          {sales.map(sale => (
            <div key={sale.id}>
              <button
                onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2/50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text font-medium">
                    {sale.items.map(i => `${i.name} ×${i.qty}`).join(', ')}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 font-mono-data">{formatDateTime(sale.createdAt)}</p>
                </div>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0',
                  sale.paymentMethod === 'pix' ? 'bg-primary/10 text-primary' :
                  sale.paymentMethod === 'dinheiro' ? 'bg-success/10 text-success' :
                  'bg-violet/10 text-violet'
                )}>
                  {PAYMENT_LABELS[sale.paymentMethod]}
                </span>
                <p className="font-mono-data font-bold text-text flex-shrink-0 w-24 text-right">
                  {formatCurrency(sale.total)}
                </p>
                <ChevronDown
                  size={14}
                  className={cn('text-text-muted flex-shrink-0 transition-transform', expandedSale === sale.id && 'rotate-180')}
                />
              </button>

              {expandedSale === sale.id && (
                <div className="px-5 pb-4 bg-surface-2/30">
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left px-3 py-2 text-text-muted font-medium">Produto</th>
                          <th className="text-center px-3 py-2 text-text-muted font-medium w-16">Qtd</th>
                          <th className="text-right px-3 py-2 text-text-muted font-medium w-24">Unit.</th>
                          <th className="text-right px-3 py-2 text-text-muted font-medium w-24">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sale.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 text-text">{item.name}</td>
                            <td className="px-3 py-2 text-center font-mono-data text-text-muted">{item.qty}</td>
                            <td className="px-3 py-2 text-right font-mono-data text-text-muted">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-3 py-2 text-right font-mono-data font-bold text-text">{formatCurrency(item.unitPrice * item.qty)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border bg-surface-2/50">
                          <td colSpan={3} className="px-3 py-2 text-right text-text-muted font-medium">Total</td>
                          <td className="px-3 py-2 text-right font-mono-data font-bold text-primary">{formatCurrency(sale.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* SUCCESS MODAL */}
    {summary && (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="glass rounded-2xl w-full max-w-sm p-6 border border-primary/20 glow-primary">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-display font-bold text-text">Venda registrada!</p>
              <p className="text-xs text-text-muted font-mono-data">{formatDateTime(summary.date)}</p>
            </div>
          </div>

          <div className="bg-surface-2 rounded-xl p-3 mb-4 space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
            {summary.items.map(({ product, qty }) => (
              <div key={product.id} className="flex justify-between text-xs">
                <span className="text-text-muted truncate mr-2">{product.name} <span className="text-text-muted">×{qty}</span></span>
                <span className="font-mono-data text-text flex-shrink-0">{formatCurrency(product.salePrice * qty)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 mb-4 text-sm">
            {summary.discount > 0 && (
              <>
                <div className="flex justify-between text-text-muted">
                  <span>Subtotal</span>
                  <span className="font-mono-data">{formatCurrency(summary.total)}</span>
                </div>
                <div className="flex justify-between text-warning">
                  <span>Desconto</span>
                  <span className="font-mono-data">- {formatCurrency(summary.discount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold border-t border-border pt-2">
              <span className="text-text">Total pago</span>
              <span className="font-mono-data text-primary text-lg">{formatCurrency(summary.finalTotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-text-muted">
              <span>Pagamento</span>
              <span className="capitalize">{PAYMENT_OPTIONS.find(o => o.value === summary.payment)?.label}</span>
            </div>
            {summary.change > 0 && (
              <div className="flex justify-between text-success font-semibold">
                <span>Troco</span>
                <span className="font-mono-data">{formatCurrency(summary.change)}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => { setSummary(null); searchRef.current?.focus(); }}
            className="w-full bg-primary text-bg font-bold py-3 rounded-xl hover:bg-primary-glow transition-all">
            Nova venda
          </button>
        </div>
      </div>
    )}
    </div>
  );
}
