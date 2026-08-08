import { SQLiteDatabase } from 'expo-sqlite';
import {
  claimLegacyNotes,
  deleteLocalNote,
  getNote,
  getPendingNotes,
  markNotePendingDelete,
  markNoteSynced,
  upsertRemoteNote,
} from '../database/database';
import {
  createRemoteNote,
  deleteRemoteNote,
  fetchRemoteNotesPage,
  findRemoteNoteByClientId,
  isRemoteConflict,
  isRemoteMissing,
  toLocalNoteSnapshot,
  updateRemoteNote,
} from '../api/notes';
import { Note, NoteFilters } from '../types/note';
import { SyncResult } from './records-sync';

const activeSyncs = new WeakMap<SQLiteDatabase, Map<string, Promise<SyncResult>>>();

const syncCreate = async (db: SQLiteDatabase, note: Note) => {
  try {
    const remote = await createRemoteNote(note);
    await markNoteSynced(db, note.ownerUserId, note.id, remote.id);
    return true;
  } catch (error) {
    if (!isRemoteConflict(error)) {
      return false;
    }
    try {
      const remote = await findRemoteNoteByClientId(note.clientId);
      if (!remote || remote.syncStatus === 'DELETED') {
        return false;
      }
      await markNoteSynced(db, note.ownerUserId, note.id, remote.id);
      return true;
    } catch {
      return false;
    }
  }
};

const syncUpdate = async (db: SQLiteDatabase, note: Note) => {
  if (!note.serverId) {
    return syncCreate(db, note);
  }
  try {
    const remote = await updateRemoteNote(note.serverId, note);
    await markNoteSynced(db, note.ownerUserId, note.id, remote.id);
    return true;
  } catch (error) {
    if (!isRemoteMissing(error)) {
      return false;
    }
  }
  try {
    const remote = await findRemoteNoteByClientId(note.clientId);
    if (!remote || remote.syncStatus === 'DELETED') {
      return false;
    }
    const updated = await updateRemoteNote(remote.id, note);
    await markNoteSynced(db, note.ownerUserId, note.id, updated.id);
    return true;
  } catch {
    return false;
  }
};

async function runSync(db: SQLiteDatabase, ownerUserId: string): Promise<SyncResult> {
  await claimLegacyNotes(db, ownerUserId);
  const notes = await getPendingNotes(db, ownerUserId);
  let synced = 0;
  let failed = 0;

  for (const note of notes) {
    let succeeded = false;
    if (note.syncStatus === 'pending_delete') {
      try {
        if (note.serverId) {
          await deleteRemoteNote(note.serverId);
        }
        await deleteLocalNote(db, ownerUserId, note.id);
        succeeded = true;
      } catch (error) {
        if (isRemoteMissing(error)) {
          await deleteLocalNote(db, ownerUserId, note.id);
          succeeded = true;
        }
      }
    } else {
      succeeded = note.syncStatus === 'pending_update'
        ? await syncUpdate(db, note)
        : await syncCreate(db, note);
    }
    if (succeeded) synced += 1;
    else failed += 1;
  }
  return { synced, failed };
}

export function syncPendingNotes(db: SQLiteDatabase, ownerUserId: string) {
  let databaseSyncs = activeSyncs.get(db);
  if (!databaseSyncs) {
    databaseSyncs = new Map();
    activeSyncs.set(db, databaseSyncs);
  }
  const running = databaseSyncs.get(ownerUserId);
  if (running) return running;
  const sync = runSync(db, ownerUserId).finally(() => {
    const current = activeSyncs.get(db);
    current?.delete(ownerUserId);
    if (current?.size === 0) activeSyncs.delete(db);
  });
  databaseSyncs.set(ownerUserId, sync);
  return sync;
}

interface SyncNotesOptions {
  filters?: NoteFilters;
  limit?: number;
  offset?: number;
}

export async function syncNotes(
  db: SQLiteDatabase,
  ownerUserId: string,
  { filters = {}, limit = 50, offset = 0 }: SyncNotesOptions = {},
) {
  const result = await syncPendingNotes(db, ownerUserId);
  const page = await fetchRemoteNotesPage({ filters, limit, offset });
  await db.withTransactionAsync(async () => {
    for (const note of page.notes) {
      await upsertRemoteNote(db, ownerUserId, toLocalNoteSnapshot(note));
    }
  });
  return { ...result, remoteTotal: page.total };
}

export async function syncNoteById(db: SQLiteDatabase, ownerUserId: string, id: number) {
  await syncPendingNotes(db, ownerUserId);
  return (await getNote(db, ownerUserId, id))?.syncStatus === 'synced';
}

export async function deleteAndSyncNote(db: SQLiteDatabase, ownerUserId: string, id: number) {
  let note = await getNote(db, ownerUserId, id);
  if (!note) return true;
  if (note.syncStatus === 'pending_create') {
    await syncPendingNotes(db, ownerUserId);
    note = await getNote(db, ownerUserId, id);
  }
  if (!note) return true;
  if (!note.serverId) {
    await deleteLocalNote(db, ownerUserId, id);
    return true;
  }
  await markNotePendingDelete(db, ownerUserId, id);
  await syncPendingNotes(db, ownerUserId);
  return (await getNote(db, ownerUserId, id)) === null;
}
