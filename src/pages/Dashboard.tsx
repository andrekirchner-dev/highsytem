import { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, ShoppingBag, DollarSign, Package, AlertTriangle, XCircle, ShoppingCart } from 'lucide-react';
import { subscribeSales, subscribeProducts } from '../lib/firestore';
import type { Product, Sale } from '../types';
import { formatCurrency } from '../lib/utils';
import Badge from '../components/ui/Badge';
import QuickSaleModal from '../components/QuickSaleModal';

function CountUp({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => {
    const duration = 800;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    let step = 0;
    clearInterval(ref.current);
    ref.current = setInterval(() => {
      step++;
      current = Math.min(current + increment, value);
      setDisplay(current);
      if (step >= steps) clearInterval(ref.current);
    }, duration / steps);
    return () => clearInterval(ref.current);
  }, [value]);
  return <>{prefix}{value % 1 !== 0 ? display.toFixed(2) : Math.round(display)}{suffix}</>;
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [saleOpen, setSaleOpen] = useState(false);

  useEffect(() => {
    const unsub1 = subscribeProducts(setProducts);
    const unsub2 = subscribeSales(setSales, 90);
    return () => { unsub1(); unsub2(); };
  }, []);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - range);

  const todaySales = sales.filter(s => s.createdAt >= todayStart);
  const monthSales = sales.filter(s => s.createdAt >= monthStart);
  const revenueToday = todaySales.reduce((s, v) => s + v.total, 0);
  const revenueMonth = monthSales.reduce((s, v) => s + v.total, 0);
  const avgTicket = sales.length > 0 ? sales.reduce((s, v) => s + v.total, 0) / sales.length : 0;

  // Chart data
  const rangeSales = sales.filter(s => s.createdAt >= rangeStart);
  const dailyMap: Record<string, number> = {};
  rangeSales.forEach(s => {
    const key = s.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    dailyMap[key] = (dailyMap[key] || 0) + s.total;
  });
  const chartData = Object.entries(dailyMap).map(([date, total]) => ({ date, total }));

  // Top products
  const productQtyMap: Record<string, { name: string; qty: number }> = {};
  rangeSales.forEach(s => s.items.forEach(i => {
    if (!productQtyMap[i.productId]) productQtyMap[i.productId] = { name: i.name, qty: 0 };
    productQtyMap[i.productId].qty += i.qty;
  }));
  const topProducts = Object.values(productQtyMap).sort((a, b) => b.qty - a.qty).slice(0, 6);

  // Revenue by category
  const catRevMap: Record<string, number> = {};
  rangeSales.forEach(s => s.items.forEach(i => {
    const prod = products.find(p => p.id === i.productId);
    const cat = prod?.category || 'Outros';
    catRevMap[cat] = (catRevMap[cat] || 0) + i.unitPrice * i.qty;
  }));
  const catData = Object.entries(catRevMap).map(([name, value]) => ({ name, value }));
  const COLORS = ['#8BE04E', '#FF7A1A', '#7C5CFF', '#FFC53D', '#FF4D4D', '#4DCFFF', '#E04EBE', '#9DFF6B', '#5CE0FF', '#FFAA4D'];

  const noStock = products.filter(p => p.stockQty === 0);
  const lowStock = products.filter(p => p.stockQty > 0 && p.stockQty <= p.minStock);

  const KPI_CARDS = [
    { label: 'Faturamento hoje', value: revenueToday, format: 'currency', icon: DollarSign, color: 'text-primary', delay: 'stagger-1' },
    { label: 'Faturamento no mês', value: revenueMonth, format: 'currency', icon: TrendingUp, color: 'text-violet', delay: 'stagger-2' },
    { label: 'Ticket médio', value: avgTicket, format: 'currency', icon: ShoppingBag, color: 'text-amber', delay: 'stagger-3' },
    { label: 'Vendas hoje', value: todaySales.length, format: 'number', icon: Package, color: 'text-warning', delay: 'stagger-4' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-text">Dashboard</h1>
        <button
          onClick={() => setSaleOpen(true)}
          className="flex items-center gap-2 bg-primary text-bg font-bold px-4 py-2.5 rounded-xl hover:bg-primary-glow transition-all glow-primary text-sm">
          <ShoppingCart size={16} />
          Realizar venda
        </button>
      </div>
      {saleOpen && <QuickSaleModal onClose={() => setSaleOpen(false)} />}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map(({ label, value, format, icon: Icon, color, delay }) => (
          <div key={label} className={`glass glass-hover rounded-2xl p-5 animate-fade-up ${delay} transition-all`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-text-muted">{label}</p>
              <Icon size={16} className={color} />
            </div>
            <p className={`font-mono-data text-2xl font-bold text-text ${color}`}>
              {format === 'currency' ? (
                <span>R$ <CountUp value={value} /></span>
              ) : (
                <CountUp value={value} />
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-text">Vendas no tempo</h2>
            <div className="flex gap-1">
              {([7, 30, 90] as const).map(d => (
                <button key={d} onClick={() => setRange(d)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${range === d ? 'bg-primary text-bg' : 'text-text-muted hover:text-text'}`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8BE04E" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8BE04E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A352A" />
              <XAxis dataKey="date" stroke="#93A092" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <YAxis stroke="#93A092" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
                tickFormatter={v => `R$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`} />
              <Tooltip
                contentStyle={{ background: '#161D16', border: '1px solid #2A352A', borderRadius: 12, fontFamily: 'JetBrains Mono' }}
                formatter={(v) => [formatCurrency(Number(v)), 'Total']} />
              <Area type="monotone" dataKey="total" stroke="#8BE04E" strokeWidth={2} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut */}
        <div className="glass rounded-2xl p-5">
          <h2 className="font-display font-semibold text-text mb-4">Por categoria</h2>
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#161D16', border: '1px solid #2A352A', borderRadius: 12 }}
                  formatter={(v) => [formatCurrency(Number(v)), '']} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ color: '#93A092', fontSize: 11 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-text-muted text-sm">Sem dados</div>
          )}
        </div>
      </div>

      {/* Top products + Stock alerts */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top products */}
        <div className="glass rounded-2xl p-5">
          <h2 className="font-display font-semibold text-text mb-4">Mais vendidos</h2>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2A352A" horizontal={false} />
                <XAxis type="number" stroke="#93A092" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <YAxis type="category" dataKey="name" width={120} stroke="#93A092"
                  tick={{ fontSize: 11, fill: '#93A092' }} />
                <Tooltip
                  contentStyle={{ background: '#161D16', border: '1px solid #2A352A', borderRadius: 12 }}
                  formatter={(v) => [Number(v), 'Unidades']} />
                <Bar dataKey="qty" fill="#8BE04E" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-text-muted text-sm">Sem dados</div>
          )}
        </div>

        {/* Stock alerts */}
        <div className="glass rounded-2xl p-5">
          <h2 className="font-display font-semibold text-text mb-4">
            Alertas de estoque
            {(noStock.length + lowStock.length) > 0 && (
              <span className="ml-2 bg-danger/20 text-danger text-xs font-mono-data px-2 py-0.5 rounded-full">
                {noStock.length + lowStock.length}
              </span>
            )}
          </h2>
          {noStock.length === 0 && lowStock.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-text-muted text-sm">
              Estoque ok
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto scrollbar-thin">
              {noStock.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-danger/5 border border-danger/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <XCircle size={14} className="text-danger flex-shrink-0" />
                    <span className="text-sm text-text">{p.name}</span>
                  </div>
                  <Badge variant="danger">Sem estoque</Badge>
                </div>
              ))}
              {lowStock.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-warning/5 border border-warning/20 rounded-xl">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-warning flex-shrink-0" />
                    <span className="text-sm text-text">{p.name}</span>
                    <span className="font-mono-data text-xs text-warning">{p.stockQty} un</span>
                  </div>
                  <Badge variant="warning">Baixo</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
