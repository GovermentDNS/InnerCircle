'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { ApiError, api, clearTokens, getTokens, saveTokens } from './api';
import type { AuthUser, TokenPair } from './api';

export type RegisterInput = {
  email: string;
  username: string;
  password: string;
  asCreator: boolean;
  displayName?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { access, refresh } = getTokens();
      if (!access && !refresh) {
        setLoading(false);
        return;
      }
      try {
        const me = await api<AuthUser>('/auth/me', { auth: true });
        if (!cancelled) setUser(me);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) clearTokens();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const finishAuth = useCallback(async (tokens: TokenPair) => {
    saveTokens(tokens);
    const me = await api<AuthUser>('/auth/me', { auth: true });
    setUser(me);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await api<TokenPair>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      await finishAuth(tokens);
    },
    [finishAuth],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const body: Record<string, unknown> = {
        email: input.email,
        username: input.username,
        password: input.password,
        asCreator: input.asCreator,
      };
      const name = input.displayName?.trim();
      if (input.asCreator && name) body.displayName = name;

      const tokens = await api<TokenPair>('/auth/register', {
        method: 'POST',
        body,
      });
      await finishAuth(tokens);
    },
    [finishAuth],
  );

  const logout = useCallback(async () => {
    const { refresh } = getTokens();
    if (refresh) {
      try {
        await api('/auth/logout', {
          method: 'POST',
          body: { refreshToken: refresh },
        });
      } catch {
        // logging out locally is enough if the server call fails
      }
    }
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
