import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, History, Settings, X, BarChart2, Lightbulb } from 'lucide-react';
import Logo from '../Logo';
import { cn } from '../../lib/utils';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/estoque', icon: Package, label: 'Estoque' },
  { to: '/vendas', icon: ShoppingCart, label: 'Vendas' },
  { to: '/historico', icon: History, label: 'Histórico' },
  { to: '/relatorios', icon: BarChart2, label: 'Relatórios' },
  { to: '/projecao', icon: Lightbulb, label: 'Projeção' },
  { to: '/config', icon: Settings, label: 'Config' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />
      )}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 z-40 flex flex-col',
        'glass border-r border-border',
        'transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0 lg:static lg:z-auto'
      )}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <Logo />
          <button onClick={onClose} className="lg:hidden text-text-muted hover:text-text">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-text-muted hover:text-text hover:bg-surface-2'
              )}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <p className="text-xs text-text-muted text-center">HighSystem v1.0</p>
        </div>
      </aside>
    </>
  );
}
