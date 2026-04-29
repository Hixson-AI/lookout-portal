import { createContext } from 'react';

interface CommandPaletteContextValue {
  open: () => void;
  close: () => void;
}

export const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);
