import { SQLiteDatabase } from 'expo-sqlite';
import {
  claimLegacyRecords,
  deleteLocalRecord,
  getPendingRecords,
  getRecord,
  markRecordPendingDelete,
  markRecordSynced,
} from '../database/database';
import {
  createRemoteRecord,
  deleteRemoteRecord,
  findRemoteRecordByClientId,
  isRemoteConflict,
  isRemoteMissing,
} from '../api/records';
import { DilemmaRecord } from '../types/record';

export interface SyncResult {
  synced: number;
  failed: number;
}

const activeSyncs = new WeakMap<SQLiteDatabase, Map<string, Promise<SyncResult>>>();

const syncCreate = async (db: SQLiteDatabase, record: DilemmaRecord) => {
  try {
    const remote = await createRemoteRecord(record);
    await markRecordSynced(db, record.ownerUserId, record.id, remote.id);
    return true;
  } catch (error) {
    if (!isRemoteConflict(error)) {
      return false;
    }

    try {
      const remote = await findRemoteRecordByClientId(record.clientId);
      if (!remote || remote.syncStatus === 'DELETED') {
        return false;
      }

      await markRecordSynced(db, record.ownerUserId, record.id, remote.id);
      return true;
    } catch {
      return false;
    }
  }
};

const syncDelete = async (db: SQLiteDatabase, record: DilemmaRecord) => {
  if (record.serverId) {
    try {
      await deleteRemoteRecord(record.serverId);
    } catch (error) {
      if (!isRemoteMissing(error)) {
        return false;
      }
    }
  }

  await deleteLocalRecord(db, record.ownerUserId, record.id);
  return true;
};

const runSync = async (db: SQLiteDatabase, ownerUserId: string): Promise<SyncResult> => {
  await claimLegacyRecords(db, ownerUserId);
  const records = await getPendingRecords(db, ownerUserId);
  let synced = 0;
  let failed = 0;

  for (const record of records) {
    const succeeded =
      record.syncStatus === 'pending_delete'
        ? await syncDelete(db, record)
        : await syncCreate(db, record);

    if (succeeded) {
      synced += 1;
    } else {
      failed += 1;
    }
  }

  return { synced, failed };
};

export function syncPendingRecords(db: SQLiteDatabase, ownerUserId: string) {
  let databaseSyncs = activeSyncs.get(db);
  if (!databaseSyncs) {
    databaseSyncs = new Map();
    activeSyncs.set(db, databaseSyncs);
  }

  const runningSync = databaseSyncs.get(ownerUserId);
  if (runningSync) {
    return runningSync;
  }

  const sync = runSync(db, ownerUserId).finally(() => {
    const currentSyncs = activeSyncs.get(db);
    currentSyncs?.delete(ownerUserId);
    if (currentSyncs?.size === 0) {
      activeSyncs.delete(db);
    }
  });
  databaseSyncs.set(ownerUserId, sync);

  return sync;
}

export async function syncRecordById(
  db: SQLiteDatabase,
  ownerUserId: string,
  id: number,
) {
  await syncPendingRecords(db, ownerUserId);
  const record = await getRecord(db, ownerUserId, id);
  return record?.syncStatus === 'synced';
}

export async function deleteAndSyncRecord(
  db: SQLiteDatabase,
  ownerUserId: string,
  id: number,
) {
  let record = await getRecord(db, ownerUserId, id);
  if (!record) {
    return true;
  }

  if (record.syncStatus === 'pending_create') {
    await syncPendingRecords(db, ownerUserId);
    record = await getRecord(db, ownerUserId, id);
  }

  if (!record) {
    return true;
  }

  if (!record.serverId) {
    await deleteLocalRecord(db, ownerUserId, id);
    return true;
  }

  await markRecordPendingDelete(db, ownerUserId, id);
  await syncPendingRecords(db, ownerUserId);
  return (await getRecord(db, ownerUserId, id)) === null;
}
