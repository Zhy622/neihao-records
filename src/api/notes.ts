import { ApiError, apiRequest } from './client';
import { Note, NoteFilters } from '../types/note';

export interface RemoteNote {
  id: string;
  userId: string;
  clientId: string | null;
  content: string;
  noteType: string;
  emotions: string[];
  categories: string[];
  syncStatus: 'ACTIVE' | 'DELETED';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface RemoteNotesPage {
  notes: RemoteNote[];
  total: number;
  limit: number;
  offset: number;
}

export function createRemoteNote(note: Note) {
  return apiRequest<RemoteNote>('/notes', {
    method: 'POST',
    body: {
      clientId: note.clientId,
      content: note.content,
      noteType: note.noteType,
      emotions: note.emotions,
      categories: note.categories,
      createdAt: note.createdAt,
    },
  });
}

export function updateRemoteNote(serverId: string, note: Note) {
  return apiRequest<RemoteNote>(`/notes/${serverId}`, {
    method: 'PATCH',
    body: {
      content: note.content,
      noteType: note.noteType,
      emotions: note.emotions,
      categories: note.categories,
    },
  });
}

export function deleteRemoteNote(serverId: string) {
  return apiRequest<RemoteNote>(`/notes/${serverId}`, { method: 'DELETE' });
}

export function fetchRemoteNotesPage({
  filters = {},
  includeDeleted,
  limit = 50,
  offset = 0,
}: {
  filters?: NoteFilters;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
} = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (includeDeleted) {
    params.set('includeDeleted', 'true');
  }
  if (filters.category) {
    params.set('category', filters.category);
  }
  return apiRequest<RemoteNotesPage>(`/notes?${params}`);
}

export async function findRemoteNoteByClientId(clientId: string) {
  const limit = 200;
  for (let offset = 0; ; offset += limit) {
    const page = await fetchRemoteNotesPage({ includeDeleted: true, limit, offset });
    const note = page.notes.find((item) => item.clientId === clientId);
    if (note) {
      return note;
    }
    if (offset + page.notes.length >= page.total) {
      return null;
    }
  }
}

export const toLocalNoteSnapshot = (note: RemoteNote) => ({
  clientId: note.clientId ?? note.id,
  serverId: note.id,
  content: note.content,
  noteType: note.noteType as Note['noteType'],
  emotions: note.emotions as Note['emotions'],
  categories: note.categories as Note['categories'],
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
});

export const isRemoteConflict = (error: unknown) => error instanceof ApiError && error.status === 409;
export const isRemoteMissing = (error: unknown) => error instanceof ApiError && error.status === 404;
