import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { DollarSign, ShoppingBag, TrendingUp, Package } from 'lucide-react';
import { getSalesByPeriod } from '../lib/firestore';
import type { Sale } from '../types';
import { formatCurrency } from '../lib/utils';

type Period = 'diario' | 'semanal' | 'mensal';

const PAYMENT_LABELS: Record<string, string> = {
  dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito',
};
const COLORS = ['#8BE04E', '#FF7A1A', '#7C5CFF', '#FFC53D', '#FF4D4D', '#4DCFFF'];

function getRange(period: Period): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  if (period === 'semanal') from.setDate(from.getDate() - 6);
  if (period === 'mensal') from.setDate(from.getDate() - 29);
  return { from, to };
}

export default function Relatorios() {
  const [period, setPeriod] = useState<Period>('mensal');
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { from, to } = getRange(period);
    getSalesByPeriod(from, to).then(data => {
      setSales(data);
      setLoading(false);
    });
  }, [period]);

  const totalRevenue = sales.reduce((s, v) => s + v.total, 0);
  const totalSales = sales.length;
  const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  const totalItems = sales.reduce((s, v) => s + v.items.reduce((a, i) => a + i.qty, 0), 0);

  const dailyMap: Record<string, number> = {};
  sales.forEach(s => {
    const key = period === 'diario'
      ? s.createdAt.getHours().toString().padStart(2, '0') + 'h'
      : s.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    dailyMap[key] = (dailyMap[key] || 0) + s.total;
  });
  const chartData = Object.entries(dailyMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, total]) => ({ label, total }));

  const paymentMap: Record<string, number> = {};
  sales.forEach(s => { paymentMap[s.paymentMethod] = (paymentMap[s.paymentMethod] || 0) + s.total; });
  const paymentData = Object.entries(paymentMap).map(([m, v]) => ({ name: PAYMENT_LABELS[m] ?? m, value: v }));

  const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  sales.forEach(s => s.items.forEach(i => {
    if (!productMap[i.productId]) productMap[i.productId] = { name: i.name, qty: 0, revenue: 0 };
    productMap[i.productId].qty += i.qty;
    productMap[i.productId].revenue += i.qty * i.unitPrice;
  }));
  const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  const periodLabel = period === 'diario' ? 'Hoje' : period === 'semanal' ? 'Últimos 7 dias' : 'Últimos 30 dias';
  const KPIS = [
    { label: 'Receita total', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-primary' },
    { label: 'Nº de vendas', value: String(totalSales), icon: ShoppingBag, color: 'text-violet' },
    { label: 'Ticket médio', value: formatCurrency(avgTicket), icon: TrendingUp, color: 'text-amber' },
    { label: 'Itens vendidos', value: String(totalItems), icon: Package, color: 'text-warning' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-2xl font-bold text-text">Relatórios</h1>
        <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border">
          {(['diario', 'semanal', 'mensal'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${period === p ? 'bg-primary text-bg' : 'text-text-muted hover:text-text'}`}>
              {p === 'diario' ? 'Diário' : p === 'semanal' ? 'Semanal' : 'Mensal'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-text-muted">Carregando...</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {KPIS.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="glass rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs text-text-muted">{label}</p>
                  <Icon size={16} className={color} />
                </div>
                <p className={`font-mono-data text-2xl font-bold text-text ${color}`}>{value}</p>
                <p className="text-xs text-text-muted mt-1">{periodLabel}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 glass rounded-2xl p-5">
              <h2 className="font-display font-semibold text-text mb-4">
                Receita por {period === 'diario' ? 'hora' : 'dia'}
              </h2>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A352A" />
                    <XAxis dataKey="label" stroke="#93A092" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                    <YAxis stroke="#93A092" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
                    <Tooltip
                      contentStyle={{ background: '#161D16', border: '1px solid #2A352A', borderRadius: 12, fontFamily: 'JetBrains Mono' }}
                      formatter={v => [formatCurrency(Number(v)), 'Receita']} />
                    <Bar dataKey="total" fill="#8BE04E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-text-muted text-sm">Sem vendas no período</div>
              )}
            </div>

            <div className="glass rounded-2xl p-5">
              <h2 className="font-display font-semibold text-text mb-4">Formas de pagamento</h2>
              {paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={paymentData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                      dataKey="value" paddingAngle={3}>
                      {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#161D16', border: '1px solid #2A352A', borderRadius: 12 }}
                      formatter={v => [formatCurrency(Number(v)), '']} />
                    <Legend iconType="circle" iconSize={8}
                      formatter={v => <span style={{ color: '#93A092', fontSize: 11 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-text-muted text-sm">Sem dados</div>
              )}
            </div>
          </div>

          {/* Top products */}
          <div className="glass rounded-2xl p-5">
            <h2 className="font-display font-semibold text-text mb-4">Produtos mais vendidos (por receita)</h2>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A352A" horizontal={false} />
                  <XAxis type="number" stroke="#93A092" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
                  <YAxis type="category" dataKey="name" width={140} stroke="#93A092"
                    tick={{ fontSize: 11, fill: '#93A092' }} />
                  <Tooltip
                    contentStyle={{ background: '#161D16', border: '1px solid #2A352A', borderRadius: 12 }}
                    formatter={v => [formatCurrency(Number(v)), 'Receita']} />
                  <Bar dataKey="revenue" fill="#7C5CFF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-32 flex items-center justify-center text-text-muted text-sm">Sem dados</div>
            )}
          </div>

          {/* Sales detail table */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="font-display font-semibold text-text">
                Detalhe das vendas
                <span className="ml-2 text-xs text-text-muted font-normal font-mono-data">({sales.length} registros)</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Data / Hora</th>
                    <th className="text-left text-xs text-text-muted font-medium px-4 py-3 hidden md:table-cell">Itens</th>
                    <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Pagamento</th>
                    <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 100).map(s => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-surface-2/50 transition-colors">
                      <td className="px-4 py-3 font-mono-data text-xs text-text-muted whitespace-nowrap">
                        {s.createdAt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted hidden md:table-cell max-w-xs truncate">
                        {s.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-text-muted">
                          {PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono-data font-bold text-primary">
                        {formatCurrency(s.total)}
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-text-muted py-12">Nenhuma venda no período</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
