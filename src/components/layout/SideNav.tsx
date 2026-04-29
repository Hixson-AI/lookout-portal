import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

export interface SideNavItem {
  to: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
}

interface SideNavProps {
  items: SideNavItem[];
}

export function SideNav({ items }: SideNavProps) {
  const location = useLocation();

  return (
    <nav className="w-full sm:w-48 shrink-0 space-y-1">
      {items.map((item) => {
        const isActive = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              item.danger && 'text-destructive hover:text-destructive hover:bg-destructive/10',
            )}
          >
            {item.icon}
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
