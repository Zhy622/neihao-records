import {
  createContext,
  PropsWithChildren,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { login, logout, register } from '../api/auth';
import { ApiError, refreshAuthSession } from '../api/client';
import { clearPeopleObservationCache } from '../cache/people-observations-cache';
import { AuthSession, LoginInput, RegisterInput } from '../types/auth';
import {
  getCurrentSession,
  loadSession,
  subscribeSession,
} from './session-store';

interface AuthContextValue {
  session: AuthSession | null;
  isRestoring: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeSession((nextSession) => {
      if (active) {
        setSession(nextSession);
      }
    });

    const restore = async () => {
      const storedSession = await loadSession();
      if (active) {
        setSession(storedSession);
      }

      if (storedSession) {
        try {
          await refreshAuthSession();
        } catch (error) {
          if (active) {
            setSession(
              error instanceof ApiError && error.status === 401
                ? null
                : getCurrentSession() ?? storedSession,
            );
          }
        }
      }

      if (active) {
        setIsRestoring(false);
      }
    };

    void restore();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (input: LoginInput) => {
    await login(input);
  }, []);

  const signUp = useCallback(async (input: RegisterInput) => {
    await register(input);
  }, []);

  const signOut = useCallback(async () => {
    await logout(getCurrentSession());
    clearPeopleObservationCache();
  }, []);

  const value = useMemo(
    () => ({ session, isRestoring, signIn, signUp, signOut }),
    [isRestoring, session, signIn, signOut, signUp],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const context = use(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
