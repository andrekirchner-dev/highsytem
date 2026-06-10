import { cn } from '../../lib/utils';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'violet' | 'amber';
  children: React.ReactNode;
  className?: string;
}

const variants = {
  default: 'bg-surface-2 text-text-muted border-border',
  success: 'bg-primary/10 text-primary border-primary/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
  violet: 'bg-violet/10 text-violet border-violet/30',
  amber: 'bg-amber/10 text-amber border-amber/30',
};

export default function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
