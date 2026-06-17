import { useState, useEffect } from 'react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Lightbulb, TrendingUp, TrendingDown, Tag, Target, Zap, Package, ShoppingBag } from 'lucide-react';
import { getSalesByPeriod, subscribeProducts } from '../lib/firestore';
import type { Product, Sale } from '../types';
import { formatCurrency, calcMargin } from '../lib/utils';

export default function Projecao() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [projRange, setProjRange] = useState<30 | 60 | 90>(30);

  useEffect(() => {
    const from = new Date();
    from.setDate(from.getDate() - 59);
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    getSalesByPeriod(from, to)
      .then(data => setSales(data))
      .catch(err => console.error('Projeção: erro ao buscar vendas', err))
      .finally(() => setLoading(false));
    return subscribeProducts(setProducts);
  }, []);

  const now = new Date();

  const last30Start = new Date(now);
  last30Start.setDate(last30Start.getDate() - 29);
  last30Start.setHours(0, 0, 0, 0);

  const prev30Start = new Date(now);
  prev30Start.setDate(prev30Start.getDate() - 59);
  prev30Start.setHours(0, 0, 0, 0);

  const last30Sales = sales.filter(s => s.createdAt >= last30Start);
  const prev30Sales = sales.filter(s => s.createdAt >= prev30Start && s.createdAt < last30Start);

  const last30Revenue = last30Sales.reduce((s, v) => s + v.total, 0);
  const prev30Revenue = prev30Sales.reduce((s, v) => s + v.total, 0);
  const growthRate = prev30Revenue > 0 ? (last30Revenue - prev30Revenue) / prev30Revenue : 0;
  const avgDaily = last30Revenue / 30;

  // Estimate profit margin from current product data
  const productMap = new Map(products.map(p => [p.id, p]));
  let costableRevenue = 0;
  let estimatedProfit = 0;
  last30Sales.forEach(s => s.items.forEach(i => {
    const prod = productMap.get(i.productId);
    if (prod && prod.costPrice > 0) {
      estimatedProfit += (i.unitPrice - prod.costPrice) * i.qty;
      costableRevenue += i.unitPrice * i.qty;
    }
  }));
  const marginRate = costableRevenue > 0 ? estimatedProfit / costableRevenue : 0.35;
  const avgDailyProfit = avgDaily * marginRate;

  // Projection scenarios (conservative / expected / optimistic)
  const base = avgDaily * projRange;
  const projData = [
    { label: 'Conservador', receita: base * 0.85, lucro: base * 0.85 * marginRate },
    { label: 'Esperado', receita: base * (1 + Math.max(growthRate, 0)), lucro: base * (1 + Math.max(growthRate, 0)) * marginRate },
    { label: 'Otimista', receita: base * 1.2, lucro: base * 1.2 * marginRate },
  ];

  // Slow-moving products: active, have stock, zero sales in last 30 days
  const soldIds = new Map<string, number>();
  last30Sales.forEach(s => s.items.forEach(i => {
    soldIds.set(i.productId, (soldIds.get(i.productId) || 0) + i.qty);
  }));
  const slowMoving = products.filter(p => p.active && p.stockQty > 0 && !soldIds.has(p.id));

  // High margin products (active, with cost data)
  const highMargin = products
    .filter(p => p.active && p.costPrice > 0 && p.salePrice > 0)
    .map(p => ({ ...p, margin: calcMargin(p.costPrice, p.salePrice) }))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5);

  // Top sellers
  const topSellers = [...soldIds.entries()]
    .map(([id, qty]) => ({ product: productMap.get(id), qty }))
    .filter(x => x.product)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 3);

  const TIPS = [
    { icon: Zap, title: 'Combos e pacotes', color: 'text-primary',
      desc: 'Agrupe produtos complementares com 10% de desconto no combo. Aumenta o ticket médio sem reduzir margem.' },
    { icon: Tag, title: 'Promoção semanal', color: 'text-violet',
      desc: 'Destaque um produto diferente por semana com 10–15% off. Cria hábito de visita recorrente.' },
    { icon: ShoppingBag, title: 'Upsell na venda', color: 'text-warning',
      desc: 'Ofereça sempre um complemento no fechamento. Aumenta ticket médio em 20–30%.' },
    { icon: Target, title: 'Foco nos produtos de maior margem', color: 'text-amber',
      desc: 'Treine a equipe para oferecer ativamente os itens com maior margem bruta.' },
    { icon: Package, title: 'Reposição inteligente', color: 'text-primary',
      desc: 'Garanta estoque duplo dos top sellers. Falta de produto é a principal causa de venda perdida.' },
    ...(topSellers[0]?.product ? [{
      icon: TrendingUp,
      title: `Destaque "${topSellers[0].product.name}"`,
      color: 'text-violet',
      desc: `Seu produto mais vendido no período (${topSellers[0].qty} un). Posicione em local de destaque na loja.`,
    }] : []),
  ];

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold text-text">Projeção & Estratégia</h1>

      {loading ? (
        <div className="flex justify-center py-20 text-text-muted">Carregando...</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Receita média/dia (30d)', value: formatCurrency(avgDaily), color: 'text-primary' },
              { label: 'Lucro médio/dia (est.)', value: formatCurrency(avgDailyProfit), color: 'text-violet' },
              { label: 'Margem estimada', value: `${(marginRate * 100).toFixed(1)}%`, color: 'text-amber' },
              {
                label: 'Crescimento (30d vs 30d)',
                value: `${growthRate >= 0 ? '+' : ''}${(growthRate * 100).toFixed(1)}%`,
                color: growthRate >= 0 ? 'text-primary' : 'text-danger',
                icon: growthRate >= 0 ? TrendingUp : TrendingDown,
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="glass rounded-2xl p-5">
                <p className="text-xs text-text-muted mb-2">{label}</p>
                <p className={`font-mono-data text-2xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Projection chart */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <h2 className="font-display font-semibold text-text">Projeção de receita e lucro</h2>
                <p className="text-xs text-text-muted mt-0.5">Baseado na média dos últimos 30 dias</p>
              </div>
              <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border">
                {([30, 60, 90] as const).map(d => (
                  <button key={d} onClick={() => setProjRange(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${projRange === d ? 'bg-primary text-bg' : 'text-text-muted hover:text-text'}`}>
                    {d} dias
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-text-muted mb-3">Receita projetada (R$)</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={projData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A352A" />
                    <XAxis dataKey="label" stroke="#93A092" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#93A092" tick={{ fontSize: 11 }}
                      tickFormatter={v => `${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip contentStyle={{ background: '#161D16', border: '1px solid #2A352A', borderRadius: 12 }}
                      formatter={v => [formatCurrency(Number(v)), 'Receita']} />
                    <Bar dataKey="receita" radius={[4, 4, 0, 0]}>
                      <Cell fill="#8BE04E" opacity={0.7} />
                      <Cell fill="#8BE04E" />
                      <Cell fill="#9DFF6B" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-xs text-text-muted mb-3">Lucro projetado (est.)</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={projData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A352A" />
                    <XAxis dataKey="label" stroke="#93A092" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#93A092" tick={{ fontSize: 11 }}
                      tickFormatter={v => `${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                    <Tooltip contentStyle={{ background: '#161D16', border: '1px solid #2A352A', borderRadius: 12 }}
                      formatter={v => [formatCurrency(Number(v)), 'Lucro']} />
                    <Bar dataKey="lucro" radius={[4, 4, 0, 0]}>
                      <Cell fill="#7C5CFF" opacity={0.7} />
                      <Cell fill="#7C5CFF" />
                      <Cell fill="#9D8FFF" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-border">
              {projData.map(({ label, receita, lucro }, i) => (
                <div key={label} className="text-center">
                  <p className="text-xs text-text-muted mb-1">{label}</p>
                  <p className={`font-mono-data font-bold text-sm ${i === 0 ? 'text-text-muted' : i === 1 ? 'text-primary' : 'text-violet'}`}>
                    {formatCurrency(receita)}
                  </p>
                  <p className="text-xs text-text-muted">lucro: {formatCurrency(lucro)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Slow movers + high margin */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Tag size={16} className="text-warning" />
                <h2 className="font-display font-semibold text-text">Candidatos a promoção</h2>
              </div>
              <p className="text-xs text-text-muted mb-4">Produtos em estoque sem venda nos últimos 30 dias</p>
              {slowMoving.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
                  {slowMoving.slice(0, 10).map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-text">{p.name}</p>
                        <p className="text-xs text-text-muted">{p.stockQty} un — {formatCurrency(p.salePrice)}</p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-xs text-warning">Desconto sugerido</p>
                        <p className="text-sm font-mono-data font-bold text-warning">15–20%</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 text-primary text-sm">
                  Todos os produtos estão girando!
                </div>
              )}
            </div>

            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Target size={16} className="text-violet" />
                <h2 className="font-display font-semibold text-text">Foco de vendas</h2>
              </div>
              <p className="text-xs text-text-muted mb-4">Maior margem bruta — priorize estes produtos</p>
              {highMargin.length > 0 ? (
                <div className="space-y-2">
                  {highMargin.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-violet/5 border border-violet/20 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-text">{p.name}</p>
                        <p className="text-xs text-text-muted">{formatCurrency(p.salePrice)}</p>
                      </div>
                      <span className="font-mono-data text-sm font-bold text-violet shrink-0 ml-3">
                        {p.margin.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 text-text-muted text-sm">
                  Cadastre preços de custo nos produtos
                </div>
              )}
            </div>
          </div>

          {/* Growth tips */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={16} className="text-amber" />
              <h2 className="font-display font-semibold text-text">Ideias para aumentar vendas</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {TIPS.map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="flex gap-3 p-4 bg-surface-2 rounded-xl border border-border">
                  <Icon size={18} className={`${color} shrink-0 mt-0.5`} />
                  <div>
                    <p className="text-sm font-semibold text-text mb-1">{title}</p>
                    <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
