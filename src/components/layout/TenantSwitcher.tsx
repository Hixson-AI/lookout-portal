import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { useTenantContext } from '../../contexts/TenantContext';
import { Button } from '../ui/button';

export function TenantSwitcher() {
  const { currentTenant, availableTenants, setCurrentTenant } = useTenantContext();
  const [open, setOpen] = useState(false);

  if (!currentTenant) return null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="sm" className="gap-1">
          <span>{currentTenant.name}</span>
          <span className="text-muted-foreground">▾</span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-4">
          <Command className="rounded-lg border bg-card shadow-lg">
            <Command.Input placeholder="Search tenants..." className="h-12 px-4" />
            <Command.List className="max-h-[400px] overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No tenants found.
              </Command.Empty>
              {availableTenants.length > 0 && (
                <>
                  <Command.Group heading="All tenants">
                    {availableTenants.map((tenant) => (
                      <Command.Item
                        key={tenant.id}
                        value={tenant.slug}
                        onSelect={() => {
                          setCurrentTenant(tenant.slug);
                          setOpen(false);
                        }}
                        className="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-accent"
                      >
                        <div>
                          <div className="font-medium">{tenant.name}</div>
                          <div className="text-xs text-muted-foreground">@{tenant.slug}</div>
                        </div>
                        {tenant.id === currentTenant.id && (
                          <span className="text-xs text-muted-foreground">✓</span>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                </>
              )}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
