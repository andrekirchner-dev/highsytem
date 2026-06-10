import { Menu, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  onMenuToggle: () => void;
  lowStockCount: number;
}

export default function Header({ onMenuToggle, lowStockCount }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 glass border-b border-border px-4 py-3 flex items-center justify-between">
      <button onClick={onMenuToggle} className="lg:hidden text-text-muted hover:text-text">
        <Menu size={22} />
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <div className="relative">
          <Bell size={20} className="text-text-muted hover:text-text cursor-pointer" />
          {lowStockCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-danger text-white text-[10px] font-mono-data font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {lowStockCount > 9 ? '9+' : lowStockCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <span className="text-sm text-text-muted hidden sm:block">{user?.email}</span>
        </div>
        <button onClick={logout} className="text-text-muted hover:text-danger transition-colors">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
