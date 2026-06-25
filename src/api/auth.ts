import { clearSession, saveSession } from '../auth/session-store';
import { AuthSession, LoginInput, RegisterInput } from '../types/auth';
import { publicApiRequest } from './client';

export async function login(input: LoginInput) {
  const session = await publicApiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: input,
  });
  await saveSession(session);
  return session;
}

export async function register(input: RegisterInput) {
  const session = await publicApiRequest<AuthSession>('/auth/register', {
    method: 'POST',
    body: input,
  });
  await saveSession(session);
  return session;
}

export async function logout(session: AuthSession | null) {
  await clearSession();

  if (!session) {
    return;
  }

  try {
    await publicApiRequest('/auth/logout', {
      method: 'POST',
      body: { refreshToken: session.tokens.refreshToken },
    });
  } catch {
    // Local logout must succeed even when the API is unavailable.
  }
}
