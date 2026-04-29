/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useCallback, useContext, ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';

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

  return (
    <CommandPaletteContext.Provider value={{ open: openPalette, close: closePalette }}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50">
            <Command className="rounded-lg border bg-card shadow-lg">
              <Command.Input placeholder="Type to search..." className="h-12 px-4" />
              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>
                {/* Content will be populated in Phase 6 */}
                <Command.Group heading="Apps">
                  <Command.Empty>Apps will appear here</Command.Empty>
                </Command.Group>
                <Command.Group heading="Navigate">
                  <Command.Item value="apps" onSelect={() => {}}>
                    Go to Apps
                  </Command.Item>
                  <Command.Item value="settings" onSelect={() => {}}>
                    Go to Settings
                  </Command.Item>
                  <Command.Item value="activity" onSelect={() => {}}>
                    Go to Activity
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
