import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { LogOut, Menu, X } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/assets/logos/lukout_mark.svg" alt="lukout" className="h-8 w-8" />
          <h1 className="text-xl font-bold text-gradient">lukout Portal</h1>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            {/* Desktop navigation */}
            <nav className="hidden md:flex items-center gap-4">
              {user.isSystemAdmin ? (
                <>
                  <a
                    href="/tenants"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    All Tenants
                  </a>
                  <a
                    href="/platform"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Platform Admin
                  </a>
                </>
              ) : (
                <a
                  href="/tenants"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  My Tenants
                </a>
              )}
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </nav>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        )}
      </div>
      {/* Mobile menu */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-sm">
          <nav className="container mx-auto px-4 py-3 flex flex-col gap-3">
            {user.isSystemAdmin ? (
              <>
                <a
                  href="/tenants"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  All Tenants
                </a>
                <a
                  href="/platform"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Platform Admin
                </a>
              </>
            ) : (
              <a
                href="/tenants"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                My Tenants
              </a>
            )}
            <span className="text-sm text-muted-foreground py-2">{user.email}</span>
          </nav>
        </div>
      )}
    </header>
  );
}
