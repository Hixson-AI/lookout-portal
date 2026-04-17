import { createContext } from 'react';
import type { JwtPayload } from '../lib/auth';

export interface AuthContextValue {
  user: JwtPayload | null;
  loading: boolean;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
