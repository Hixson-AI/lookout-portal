import { useContext } from 'react';
import { CommandPaletteContext } from './CommandPaletteContext.tsx';

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return context;
}
