import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import {
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

function getInitials(input: string | undefined): string {
  if (!input) return '?';
  const trimmed = input.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  const local = trimmed.split('@')[0];
  return local.slice(0, 2).toUpperCase();
}

export function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Close user dropdown on outside click / escape
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenuOpen]);

  const navItems: NavItem[] = user
    ? user.isSystemAdmin
      ? [
          { to: '/tenants', label: 'All Tenants', icon: Building2 },
          { to: '/platform', label: 'Platform Admin', icon: ShieldCheck },
        ]
      : [{ to: '/tenants', label: 'My Tenants', icon: Building2 }]
    : [];

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
      isActive
        ? 'text-foreground bg-accent'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
    );

  const displayName = user?.name || user?.email || '';
  const initials = getInitials(user?.name || user?.email);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-md px-1 py-1 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 ring-1 ring-primary/20">
            <img src="/assets/logos/lukout_mark.svg" alt="" className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-tight text-foreground">
              lukout
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Portal
            </span>
          </span>
        </Link>

        {user && (
          <>
            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClasses}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            {/* Right side: user menu + mobile toggle */}
            <div className="flex items-center gap-2">
              {/* User menu */}
              <div className="relative hidden md:block" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border border-border bg-card pl-1 pr-2 py-1 text-sm transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    userMenuOpen && 'bg-muted',
                  )}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                      {initials}
                    </span>
                  )}
                  <span className="max-w-[140px] truncate text-foreground">
                    {user.name || user.email.split('@')[0]}
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-muted-foreground transition-transform',
                      userMenuOpen && 'rotate-180',
                    )}
                  />
                </button>
                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-64 origin-top-right overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg ring-1 ring-black/5 animate-fade-in"
                  >
                    <div className="flex items-center gap-3 border-b border-border px-3 py-3">
                      {user.picture ? (
                        <img
                          src={user.picture}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                          {initials}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {displayName}
                        </div>
                        {user.name && (
                          <div className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </div>
                        )}
                        {user.isSystemAdmin && (
                          <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                            <Shield className="h-3 w-3" />
                            System Admin
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      <LogOut className="h-4 w-4 text-muted-foreground" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur">
          <div className="container mx-auto px-4 py-3 space-y-3">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={navLinkClasses}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <div className="flex min-w-0 items-center gap-2">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {initials}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {displayName}
                  </div>
                  {user.name && (
                    <div className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </div>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="gap-1">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
