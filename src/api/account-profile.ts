import { apiRequest } from './client';

export type AvatarMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic';

export type RemoteAccountProfile = {
  displayName: string | null;
  signature: string;
  avatarDataUrl: string | null;
  updatedAt: string;
};

export type UpdateAccountProfileInput = {
  displayName?: string;
  signature?: string;
  avatarMimeType?: AvatarMimeType;
  avatarBase64?: string;
};

export function getRemoteAccountProfile() {
  return apiRequest<RemoteAccountProfile>('/auth/profile');
}

export function updateRemoteAccountProfile(input: UpdateAccountProfileInput) {
  return apiRequest<RemoteAccountProfile>('/auth/profile', {
    method: 'PATCH',
    body: input,
  });
}
