import * as SecureStore from 'expo-secure-store';
import { AuthSession } from '../types/auth';

const SESSION_KEY = 'neihao.auth.session.v1';

type SessionListener = (session: AuthSession | null) => void;

let currentSession: AuthSession | null = null;
let loaded = false;
let loadPromise: Promise<AuthSession | null> | null = null;
const listeners = new Set<SessionListener>();

const isAuthSession = (value: unknown): value is AuthSession => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as Partial<AuthSession>;
  return Boolean(
    session.user?.id &&
      session.user.email &&
      session.tokens?.accessToken &&
      session.tokens.refreshToken,
  );
};

const canPersistSecurely = async () => {
  if (process.env.EXPO_OS === 'web') {
    return false;
  }

  return SecureStore.isAvailableAsync();
};

const notify = () => {
  listeners.forEach((listener) => listener(currentSession));
};

export function getCurrentSession() {
  return currentSession;
}

export async function loadSession(): Promise<AuthSession | null> {
  if (loaded) {
    return currentSession;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      if (!(await canPersistSecurely())) {
        return null;
      }

      const serialized = await SecureStore.getItemAsync(SESSION_KEY);
      if (!serialized) {
        return null;
      }

      const parsed: unknown = JSON.parse(serialized);
      if (!isAuthSession(parsed)) {
        await SecureStore.deleteItemAsync(SESSION_KEY);
        return null;
      }

      currentSession = parsed;
      return currentSession;
    } catch {
      currentSession = null;
      return null;
    } finally {
      loaded = true;
      loadPromise = null;
      notify();
    }
  })();

  return loadPromise;
}

export async function saveSession(session: AuthSession): Promise<void> {
  if (await canPersistSecurely()) {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  }

  currentSession = session;
  loaded = true;
  notify();
}

export async function clearSession(): Promise<void> {
  try {
    if (await canPersistSecurely()) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
  } finally {
    currentSession = null;
    loaded = true;
    notify();
  }
}

export function subscribeSession(listener: SessionListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
