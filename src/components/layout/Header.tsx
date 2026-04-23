import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { LogOut } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gradient">Lookout Portal</h1>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline-block">{user.email}</span>
            <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
