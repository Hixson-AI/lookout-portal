import { Outlet, Link, useLocation } from 'react-router-dom';
import { TenantSwitcher } from '../../components/layout/TenantSwitcher';
import { Button } from '../../components/ui/button';
import { useCommandPalette } from '../../components/palette/CommandPalette';
import { useTenantContext } from '../../contexts/TenantContext';

export function WorkspaceShell() {
  const { currentTenant } = useTenantContext();
  const { open } = useCommandPalette();
  const location = useLocation();

  if (!currentTenant) {
    return <div className="min-h-screen flex items-center justify-center">Loading workspace...</div>;
  }

  const tenantSlug = currentTenant.slug;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-semibold tracking-tight text-foreground">
              Lookout
            </Link>
            <TenantSwitcher />
          </div>
          <nav className="flex items-center gap-4">
            <Link
              to={`/${tenantSlug}`}
              className={`text-sm transition-colors ${
                location.pathname === `/${tenantSlug}` || location.pathname === `/${tenantSlug}/`
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Apps
            </Link>
            <Link
              to={`/${tenantSlug}/activity`}
              className={`text-sm transition-colors ${
                location.pathname === `/${tenantSlug}/activity`
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Activity
            </Link>
            <Link
              to={`/${tenantSlug}/settings`}
              className={`text-sm transition-colors ${
                location.pathname.startsWith(`/${tenantSlug}/settings`)
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Settings
            </Link>
            <Button variant="ghost" size="sm" onClick={open}>
              ⌘K
            </Button>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8 max-w-6xl">
        <Outlet />
      </main>
    </div>
  );
}
