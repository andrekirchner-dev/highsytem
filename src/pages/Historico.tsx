import { useState, useEffect } from 'react';
import { getSalesByPeriod } from '../lib/firestore';
import type { Sale } from '../types';
import { formatCurrency, formatDateTime } from '../lib/utils';

const PAYMENT_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro', pix: 'PIX', debito: 'Débito', credito: 'Crédito',
};

export default function Historico() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterPayment, setFilterPayment] = useState('');
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<Sale | null>(null);

  useEffect(() => {
    setLoading(true);
    getSalesByPeriod(new Date(from), new Date(to + 'T23:59:59'))
      .then(setSales)
      .finally(() => setLoading(false));
  }, [from, to]);

  const filtered = filterPayment ? sales.filter(s => s.paymentMethod === filterPayment) : sales;
  const totalRevenue = filtered.reduce((s, v) => s + v.total, 0);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl font-bold text-text">Histórico de vendas</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted">De</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted">Até</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary" />
        </div>
        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)}
          className="bg-surface border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:border-primary">
          <option value="">Todos os pagamentos</option>
          {Object.entries(PAYMENT_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-text-muted mb-1">Total do período</p>
          <p className="font-mono-data text-xl font-bold text-primary">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-text-muted mb-1">Nº de vendas</p>
          <p className="font-mono-data text-xl font-bold text-text">{filtered.length}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-xs text-text-muted mb-1">Ticket médio</p>
          <p className="font-mono-data text-xl font-bold text-violet">
            {formatCurrency(filtered.length > 0 ? totalRevenue / filtered.length : 0)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Data/Hora</th>
                  <th className="text-left text-xs text-text-muted font-medium px-4 py-3 hidden md:table-cell">Itens</th>
                  <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Pagamento</th>
                  <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} onClick={() => setDetail(s)}
                    className="border-b border-border/50 hover:bg-surface-2/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-mono-data text-xs text-text-muted">
                      {formatDateTime(s.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs hidden md:table-cell">
                      {s.items.map(i => `${i.name} ×${i.qty}`).join(', ').slice(0, 60)}
                      {s.items.map(i => `${i.name} ×${i.qty}`).join(', ').length > 60 ? '...' : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {PAYMENT_LABEL[s.paymentMethod] ?? s.paymentMethod}
                    </td>
                    <td className="px-4 py-3 text-right font-mono-data font-bold text-text">
                      {formatCurrency(s.total)}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-text-muted py-12">
                      Nenhuma venda no período
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setDetail(null)}>
          <div className="glass rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="font-display text-lg font-bold text-text mb-1">Detalhe da venda</h2>
            <p className="text-xs text-text-muted font-mono-data mb-5">
              {formatDateTime(detail.createdAt)}
            </p>
            <div className="space-y-2 mb-4">
              {detail.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-text">
                    {item.name} <span className="text-text-muted">×{item.qty}</span>
                  </span>
                  <span className="font-mono-data text-text">
                    {formatCurrency(item.unitPrice * item.qty)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="text-text-muted text-sm">
                {PAYMENT_LABEL[detail.paymentMethod] ?? detail.paymentMethod}
              </span>
              <span className="font-mono-data font-bold text-primary text-lg">
                {formatCurrency(detail.total)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
