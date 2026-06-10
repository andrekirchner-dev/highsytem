import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import HazeBg from '../HazeBg';
import { subscribeProducts } from '../../lib/firestore';
import type { Product } from '../../types';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    return subscribeProducts(setProducts);
  }, []);

  const lowStockCount = products.filter(
    p => p.stockQty === 0 || p.stockQty <= p.minStock
  ).length;

  return (
    <div className="min-h-screen bg-bg flex relative">
      <HazeBg />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <Header
          onMenuToggle={() => setSidebarOpen(v => !v)}
          lowStockCount={lowStockCount}
        />
        <main className="flex-1 p-4 lg:p-6 overflow-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
