import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, TrendingUp, Minus, Filter, Calculator, X } from 'lucide-react';
import {
  subscribeAllProducts, subscribeCategories, createProduct,
  updateProduct, deactivateProduct, adjustStock,
} from '../lib/firestore';
import type { Product, Category } from '../types';
import { formatCurrency, calcMargin, cn } from '../lib/utils';
import Badge from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';

function ExpirationBadge({ date }: { date: string }) {
  const today = new Date();
  const exp = new Date(date + 'T00:00:00');
  const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const formatted = exp.toLocaleDateString('pt-BR');
  if (daysLeft < 0) return <p className="text-xs text-danger font-mono-data">Val: {formatted} (VENCIDO)</p>;
  if (daysLeft <= 30) return <p className="text-xs text-warning font-mono-data">Val: {formatted} ({daysLeft}d)</p>;
  return <p className="text-xs text-text-muted font-mono-data">Val: {formatted}</p>;
}

function PricingModal({ onClose }: { onClose: () => void }) {
  const [costPrice, setCostPrice] = useState('');
  const [mode, setMode] = useState<'margin' | 'markup'>('margin');
  const [rate, setRate] = useState(50);

  const cost = parseFloat(costPrice) || 0;
  const suggestedPrice = mode === 'margin' && rate < 100
    ? cost / (1 - rate / 100)
    : cost * (1 + rate / 100);
  const profit = suggestedPrice - cost;
  const margin = suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0;
  const markup = cost > 0 ? (profit / cost) * 100 : 0;

  const presets = mode === 'margin' ? [20, 30, 40, 50, 60] : [25, 50, 75, 100, 150];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold text-text">Calculadora de preço</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text"><X size={18} /></button>
        </div>
        <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border mb-4">
          {(['margin', 'markup'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setRate(m === 'margin' ? 50 : 100); }}
              className={cn('flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                mode === m ? 'bg-primary text-bg' : 'text-text-muted hover:text-text')}>
              {m === 'margin' ? 'Por Margem %' : 'Por Markup %'}
            </button>
          ))}
        </div>
        <div className="space-y-4 mb-5">
          <div>
            <label className="text-xs text-text-muted mb-1 block">Preço de custo (R$)</label>
            <input type="number" min="0" step="0.01" value={costPrice}
              onChange={e => setCostPrice(e.target.value)} placeholder="0,00"
              className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary font-mono-data" />
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">
              {mode === 'margin' ? 'Margem desejada (% do preço de venda)' : 'Markup (% acima do custo)'}
            </label>
            <input type="number" min="1" max={mode === 'margin' ? 99 : 999} value={rate}
              onChange={e => setRate(Math.min(+e.target.value, mode === 'margin' ? 99 : 999))}
              className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary font-mono-data mb-2" />
            <div className="flex gap-1.5">
              {presets.map(p => (
                <button key={p} onClick={() => setRate(p)}
                  className={cn('flex-1 py-1 rounded-lg text-xs transition-all border',
                    rate === p ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-surface-2 border-border text-text-muted hover:text-text')}>
                  {p}%
                </button>
              ))}
            </div>
          </div>
        </div>
        {cost > 0 && suggestedPrice > 0 ? (
          <div className="bg-surface-2 rounded-xl p-4 space-y-3 border border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">Preço sugerido</span>
              <span className="font-mono-data text-xl font-bold text-primary">
                {suggestedPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Lucro por unidade</span>
              <span className="font-mono-data text-primary font-medium">
                {profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Margem bruta</span>
              <span className="font-mono-data text-violet font-medium">{margin.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Markup</span>
              <span className="font-mono-data text-amber font-medium">{markup.toFixed(1)}%</span>
            </div>
          </div>
        ) : (
          <div className="bg-surface-2 rounded-xl p-4 text-center text-text-muted text-sm border border-border">
            Insira o preço de custo para calcular
          </div>
        )}
      </div>
    </div>
  );
}

function ProductModal({
  product, categories, onSave, onClose,
}: {
  product?: Product | null;
  categories: Category[];
  onSave: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    category: product?.category ?? '',
    brand: product?.brand ?? '',
    sku: product?.sku ?? '',
    costPrice: product?.costPrice ?? 0,
    salePrice: product?.salePrice ?? 0,
    stockQty: product?.stockQty ?? 0,
    minStock: product?.minStock ?? 5,
    active: product?.active ?? true,
    imageUrl: product?.imageUrl ?? '',
    expirationDate: product?.expirationDate ?? '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { expirationDate, ...rest } = form;
    await onSave(expirationDate ? { ...rest, expirationDate } : rest);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto scrollbar-thin" onClick={e => e.stopPropagation()}>
        <h2 className="font-display text-lg font-bold text-text mb-5">
          {product ? 'Editar produto' : 'Novo produto'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-text-muted mb-1 block">Nome</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Categoria</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} required
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary">
                <option value="">Selecionar...</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Marca</label>
              <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">SKU (opcional)</label>
              <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Estoque mínimo</label>
              <input type="number" min="0" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: +e.target.value }))}
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Preço de custo (R$)</label>
              <input type="number" min="0" step="0.01" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: +e.target.value }))}
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Preço de venda (R$)</label>
              <input type="number" min="0" step="0.01" value={form.salePrice} onChange={e => setForm(f => ({ ...f, salePrice: +e.target.value }))}
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary" />
            </div>
            {!product && (
              <div>
                <label className="text-xs text-text-muted mb-1 block">Estoque inicial</label>
                <input type="number" min="0" value={form.stockQty} onChange={e => setForm(f => ({ ...f, stockQty: +e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary" />
              </div>
            )}
            <div>
              <label className="text-xs text-text-muted mb-1 block">Validade (opcional)</label>
              <input type="date" value={form.expirationDate}
                onChange={e => setForm(f => ({ ...f, expirationDate: e.target.value }))}
                className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary" />
            </div>
          </div>
          {form.costPrice > 0 && form.salePrice > 0 && (
            <p className="text-xs text-text-muted">
              Margem: <span className="text-primary font-mono-data">{calcMargin(form.costPrice, form.salePrice).toFixed(1)}%</span>
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 bg-surface-2 text-text-muted border border-border rounded-xl py-2.5 text-sm hover:text-text transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-primary text-bg font-bold rounded-xl py-2.5 text-sm hover:bg-primary-glow transition-all disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StockAdjustModal({
  product, onSave, onClose,
}: {
  product: Product;
  onSave: (delta: number, reason: string) => Promise<void>;
  onClose: () => void;
}) {
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (delta === 0) return;
    setSaving(true);
    await onSave(delta, reason || (delta > 0 ? 'Entrada de estoque' : 'Saída de estoque'));
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h2 className="font-display text-lg font-bold text-text mb-1">Ajuste de estoque</h2>
        <p className="text-sm text-text-muted mb-5">
          {product.name} — atual: <span className="font-mono-data text-text">{product.stockQty}</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setDelta(d => d - 1)}
              className="w-10 h-10 rounded-xl bg-surface-2 border border-border text-text-muted hover:text-text flex items-center justify-center">
              <Minus size={16} />
            </button>
            <input type="number" value={delta} onChange={e => setDelta(+e.target.value)}
              className="flex-1 bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-center font-mono-data text-text focus:outline-none focus:border-primary" />
            <button type="button" onClick={() => setDelta(d => d + 1)}
              className="w-10 h-10 rounded-xl bg-surface-2 border border-border text-text-muted hover:text-text flex items-center justify-center">
              <Plus size={16} />
            </button>
          </div>
          <div>
            <label className="text-xs text-text-muted mb-1 block">Motivo (opcional)</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="ex: Compra de fornecedor"
              className="w-full bg-surface-2 border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 bg-surface-2 text-text-muted border border-border rounded-xl py-2.5 text-sm hover:text-text">
              Cancelar
            </button>
            <button type="submit" disabled={saving || delta === 0}
              className="flex-1 bg-primary text-bg font-bold rounded-xl py-2.5 text-sm hover:bg-primary-glow disabled:opacity-60">
              {saving ? 'Salvando...' : 'Aplicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Estoque() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterLow, setFilterLow] = useState(false);
  // undefined = modal closed; null = creating new; Product = editing
  const [editProduct, setEditProduct] = useState<Product | null | undefined>(undefined);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);

  useEffect(() => {
    const u1 = subscribeAllProducts(setProducts);
    const u2 = subscribeCategories(setCategories);
    return () => { u1(); u2(); };
  }, []);

  const filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat && p.category !== filterCat) return false;
    if (filterLow && p.stockQty > p.minStock) return false;
    return true;
  });

  function stockStatus(p: Product): 'danger' | 'warning' | 'success' {
    if (p.stockQty === 0) return 'danger';
    if (p.stockQty <= p.minStock) return 'warning';
    return 'success';
  }

  async function handleSaveProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) {
    if (editProduct) {
      await updateProduct(editProduct.id, data);
    } else {
      await createProduct({ ...data, active: true });
    }
    setEditProduct(undefined);
  }

  async function handleAdjust(delta: number, reason: string) {
    if (!adjustProduct || !user) return;
    await adjustStock(adjustProduct.id, delta, reason, user.uid);
    setAdjustProduct(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-text">Estoque</h1>
        <div className="flex gap-2">
          <button onClick={() => setPricingOpen(true)}
            className="flex items-center gap-2 bg-surface border border-border text-text-muted px-4 py-2 rounded-xl font-semibold text-sm hover:text-text transition-all">
            <Calculator size={16} /> Precificar
          </button>
          <button onClick={() => setEditProduct(null)}
            className="flex items-center gap-2 bg-primary text-bg px-4 py-2 rounded-xl font-semibold text-sm hover:bg-primary-glow transition-all glow-primary">
            <Plus size={16} /> Novo produto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar produto ou SKU..."
            className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary">
          <option value="">Todas as categorias</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <button onClick={() => setFilterLow(v => !v)}
          className={cn(
            'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-all',
            filterLow ? 'bg-warning/10 text-warning border-warning/30' : 'bg-surface border-border text-text-muted hover:text-text'
          )}>
          <Filter size={14} /> Estoque baixo
        </button>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Produto</th>
                <th className="text-left text-xs text-text-muted font-medium px-4 py-3 hidden md:table-cell">Categoria</th>
                <th className="text-right text-xs text-text-muted font-medium px-4 py-3 hidden lg:table-cell">Custo</th>
                <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Venda</th>
                <th className="text-right text-xs text-text-muted font-medium px-4 py-3 hidden lg:table-cell">Margem</th>
                <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Estoque</th>
                <th className="text-center text-xs text-text-muted font-medium px-4 py-3">Status</th>
                <th className="text-center text-xs text-text-muted font-medium px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const status = stockStatus(p);
                return (
                  <tr key={p.id} className={cn(
                    'border-b border-border/50 hover:bg-surface-2/50 transition-colors',
                    status === 'danger' && 'bg-danger/5',
                    status === 'warning' && 'bg-warning/5',
                  )}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text">{p.name}</p>
                      {p.sku && <p className="text-xs text-text-muted font-mono-data">{p.sku}</p>}
                      {p.expirationDate && <ExpirationBadge date={p.expirationDate} />}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-text-muted text-xs">{p.category}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono-data text-text-muted hidden lg:table-cell">
                      {formatCurrency(p.costPrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-data text-text font-medium">
                      {formatCurrency(p.salePrice)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-data text-primary hidden lg:table-cell">
                      {calcMargin(p.costPrice, p.salePrice).toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono-data text-text font-bold">
                      {p.stockQty}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={status}>
                        {status === 'danger' ? 'Zerado' : status === 'warning' ? 'Baixo' : 'OK'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setAdjustProduct(p)}
                          className="text-text-muted hover:text-primary transition-colors" title="Ajustar estoque">
                          <TrendingUp size={15} />
                        </button>
                        <button onClick={() => setEditProduct(p)}
                          className="text-text-muted hover:text-violet transition-colors" title="Editar">
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Inativar ${p.name}?`)) deactivateProduct(p.id); }}
                          className="text-text-muted hover:text-danger transition-colors" title="Inativar">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-text-muted py-12">Nenhum produto encontrado</td>
                </tr>
              )}

            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {pricingOpen && <PricingModal onClose={() => setPricingOpen(false)} />}
      {editProduct !== undefined && (
        <ProductModal
          product={editProduct}
          categories={categories}
          onSave={handleSaveProduct}
          onClose={() => setEditProduct(undefined)}
        />
      )}
      {adjustProduct && (
        <StockAdjustModal
          product={adjustProduct}
          onSave={handleAdjust}
          onClose={() => setAdjustProduct(null)}
        />
      )}
    </div>
  );
}
