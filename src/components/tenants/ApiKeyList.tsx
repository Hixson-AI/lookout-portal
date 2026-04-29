import type { ApiKey } from '../../lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

interface ApiKeyListProps {
  apiKeys: ApiKey[];
  onRevoke: (keyId: string) => void;
}

export function ApiKeyList({ apiKeys, onRevoke }: ApiKeyListProps) {
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const toggleReveal = (keyId: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
  };

  if (apiKeys.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No API keys found. Create one to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Label</TableHead>
          <TableHead className="hidden sm:table-cell">Key Prefix</TableHead>
          <TableHead className="hidden md:table-cell">Created</TableHead>
          <TableHead className="hidden md:table-cell">Last Used</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {apiKeys.map((apiKey) => (
          <TableRow key={apiKey.id}>
            <TableCell>
              <div className="font-medium">{apiKey.label}</div>
              <div className="font-mono text-[11px] text-muted-foreground sm:hidden mt-0.5">
                {apiKey.prefix}...
              </div>
              <div className="text-[11px] text-muted-foreground md:hidden mt-0.5">
                Used {formatDate(apiKey.lastUsedAt)}
              </div>
            </TableCell>
            <TableCell className="font-mono text-xs hidden sm:table-cell">{apiKey.prefix}...</TableCell>
            <TableCell className="hidden md:table-cell">{formatDate(apiKey.createdAt)}</TableCell>
            <TableCell className="hidden md:table-cell">{formatDate(apiKey.lastUsedAt)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(apiKey.prefix)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleReveal(apiKey.id)}
                >
                  {revealedKeys.has(apiKey.id) ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRevoke(apiKey.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
