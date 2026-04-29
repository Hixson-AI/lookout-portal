/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { useTenantContext } from '../../contexts/TenantContext';

interface CommandPaletteContextValue {
  open: () => void;
  close: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return context;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { currentTenant } = useTenantContext();

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useState(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const tenantSlug = currentTenant?.slug || '';

  return (
    <CommandPaletteContext.Provider value={{ open: openPalette, close: closePalette }}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50 p-4">
            <Command className="rounded-lg border bg-card shadow-lg">
              <Command.Input placeholder="Type to search..." className="h-12 px-4" />
              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>
                <Command.Group heading="Apps">
                  <Command.Empty>
                    {tenantSlug ? 'No apps yet' : 'Select a workspace first'}
                  </Command.Empty>
                </Command.Group>
                <Command.Group heading="Navigate">
                  <Command.Item
                    value="apps"
                    onSelect={() => handleNavigate(`/${tenantSlug}`)}
                    disabled={!tenantSlug}
                  >
                    Go to Apps
                  </Command.Item>
                  <Command.Item
                    value="settings"
                    onSelect={() => handleNavigate(`/${tenantSlug}/settings`)}
                    disabled={!tenantSlug}
                  >
                    Go to Settings
                  </Command.Item>
                  <Command.Item
                    value="activity"
                    onSelect={() => handleNavigate(`/${tenantSlug}/activity`)}
                    disabled={!tenantSlug}
                  >
                    Go to Activity
                  </Command.Item>
                </Command.Group>
                <Command.Group heading="Actions">
                  <Command.Item value="create-app" onSelect={() => {}} disabled={!tenantSlug}>
                    Create new app
                  </Command.Item>
                </Command.Group>
              </Command.List>
            </Command>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </CommandPaletteContext.Provider>
  );
}
