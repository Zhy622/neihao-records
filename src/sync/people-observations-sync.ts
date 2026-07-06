import { SQLiteDatabase } from 'expo-sqlite';
import {
  claimLegacyPeopleObservations,
  deleteLocalPeopleObservation,
  getPendingPeopleObservations,
  getPeopleObservation,
  markPeopleObservationPendingDelete,
  markPeopleObservationSynced,
  upsertRemotePeopleObservation,
} from '../database/database';
import {
  createRemotePeopleObservation,
  deleteRemotePeopleObservation,
  fetchRemotePeopleObservationsPage,
  findRemotePeopleObservationByClientId,
  isRemoteConflict,
  isRemoteMissing,
  toLocalPeopleObservationSnapshot,
  updateRemotePeopleObservation,
} from '../api/people-observations';
import { PeopleObservation, PeopleObservationFilters } from '../types/people-observation';
import { SyncResult } from './records-sync';

const activeSyncs = new WeakMap<SQLiteDatabase, Map<string, Promise<SyncResult>>>();

interface SyncPeopleObservationsOptions {
  filters?: PeopleObservationFilters;
  limit?: number;
  offset?: number;
}

const syncCreate = async (db: SQLiteDatabase, observation: PeopleObservation) => {
  try {
    const remote = await createRemotePeopleObservation(observation);
    await markPeopleObservationSynced(db, observation.ownerUserId, observation.id, remote.id);
    return true;
  } catch (error) {
    if (!isRemoteConflict(error)) {
      return false;
    }

    try {
      const remote = await findRemotePeopleObservationByClientId(observation.clientId);
      if (!remote || remote.syncStatus === 'DELETED') {
        return false;
      }

      await markPeopleObservationSynced(db, observation.ownerUserId, observation.id, remote.id);
      return true;
    } catch {
      return false;
    }
  }
};

const syncDelete = async (db: SQLiteDatabase, observation: PeopleObservation) => {
  if (observation.serverId) {
    try {
      await deleteRemotePeopleObservation(observation.serverId);
    } catch (error) {
      if (!isRemoteMissing(error)) {
        return false;
      }
    }
  }

  await deleteLocalPeopleObservation(db, observation.ownerUserId, observation.id);
  return true;
};

const syncUpdate = async (db: SQLiteDatabase, observation: PeopleObservation) => {
  if (!observation.serverId) {
    return syncCreate(db, observation);
  }

  try {
    const remote = await updateRemotePeopleObservation(observation.serverId, observation);
    await markPeopleObservationSynced(db, observation.ownerUserId, observation.id, remote.id);
    return true;
  } catch (error) {
    if (!isRemoteMissing(error)) {
      return false;
    }
  }

  try {
    const remote = await findRemotePeopleObservationByClientId(observation.clientId);
    if (!remote || remote.syncStatus === 'DELETED') {
      return false;
    }

    const updated = await updateRemotePeopleObservation(remote.id, observation);
    await markPeopleObservationSynced(db, observation.ownerUserId, observation.id, updated.id);
    return true;
  } catch {
    return false;
  }
};

const runSync = async (db: SQLiteDatabase, ownerUserId: string): Promise<SyncResult> => {
  await claimLegacyPeopleObservations(db, ownerUserId);
  const observations = await getPendingPeopleObservations(db, ownerUserId);
  let synced = 0;
  let failed = 0;

  for (const observation of observations) {
    let succeeded = false;

    if (observation.syncStatus === 'pending_delete') {
      succeeded = await syncDelete(db, observation);
    } else if (observation.syncStatus === 'pending_update') {
      succeeded = await syncUpdate(db, observation);
    } else {
      succeeded = await syncCreate(db, observation);
    }

    if (succeeded) {
      synced += 1;
    } else {
      failed += 1;
    }
  }

  return { synced, failed };
};

export function syncPendingPeopleObservations(db: SQLiteDatabase, ownerUserId: string) {
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

export async function syncPeopleObservations(
  db: SQLiteDatabase,
  ownerUserId: string,
  options: SyncPeopleObservationsOptions = {},
) {
  const result = await syncPendingPeopleObservations(db, ownerUserId);
  const page = await fetchRemotePeopleObservationsPage({
    filters: options.filters,
    limit: options.limit ?? 10,
    offset: options.offset ?? 0,
  });

  await db.withTransactionAsync(async () => {
    for (const remoteObservation of page.peopleObservations) {
      await upsertRemotePeopleObservation(
        db,
        ownerUserId,
        toLocalPeopleObservationSnapshot(remoteObservation),
      );
    }
  });

  return { ...result, remoteTotal: page.total };
}

export async function syncPeopleObservationById(
  db: SQLiteDatabase,
  ownerUserId: string,
  id: number,
) {
  await syncPendingPeopleObservations(db, ownerUserId);
  const observation = await getPeopleObservation(db, ownerUserId, id);
  return observation?.syncStatus === 'synced';
}

export async function deleteAndSyncPeopleObservation(
  db: SQLiteDatabase,
  ownerUserId: string,
  id: number,
) {
  let observation = await getPeopleObservation(db, ownerUserId, id);
  if (!observation) {
    return true;
  }

  if (observation.syncStatus === 'pending_create') {
    await syncPendingPeopleObservations(db, ownerUserId);
    observation = await getPeopleObservation(db, ownerUserId, id);
  }

  if (!observation) {
    return true;
  }

  if (!observation.serverId) {
    await deleteLocalPeopleObservation(db, ownerUserId, id);
    return true;
  }

  await markPeopleObservationPendingDelete(db, ownerUserId, id);
  await syncPendingPeopleObservations(db, ownerUserId);
  return (await getPeopleObservation(db, ownerUserId, id)) === null;
}
