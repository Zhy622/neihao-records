import { randomUUID } from 'expo-crypto';
import { SQLiteDatabase } from 'expo-sqlite';
import {
  DateRange,
  DilemmaRecord,
  Emotion,
  LocalSyncStatus,
  RecordFilters,
  RecordInput,
} from '../types/record';
import {
  PeopleObservation,
  PeopleObservationEmotion,
  PeopleObservationFilters,
  PeopleObservationInput,
} from '../types/people-observation';

type RecordRow = Omit<DilemmaRecord, 'emotions'> & { emotions: string };
type PeopleObservationRow = Omit<PeopleObservation, 'emotions'> & { emotions: string };
type TableColumn = { name: string };
export type RemoteRecordSnapshot = RecordInput & {
  clientId: string;
  serverId: string;
  createdAt: string;
  updatedAt: string;
};
export type RemotePeopleObservationSnapshot = PeopleObservationInput & {
  clientId: string;
  serverId: string;
  createdAt: string;
  updatedAt: string;
};

const mapRow = (row: RecordRow): DilemmaRecord => ({
  ...row,
  emotions: JSON.parse(row.emotions) as Emotion[],
});

const mapPeopleObservationRow = (row: PeopleObservationRow): PeopleObservation => ({
  ...row,
  emotions: JSON.parse(row.emotions) as PeopleObservationEmotion[],
});

const addSyncColumns = async (db: SQLiteDatabase) => {
  const columns = await db.getAllAsync<TableColumn>('PRAGMA table_info(records)');
  const names = new Set(columns.map((column) => column.name));

  if (!names.has('ownerUserId')) {
    await db.execAsync('ALTER TABLE records ADD COLUMN ownerUserId TEXT;');
  }
  if (!names.has('clientId')) {
    await db.execAsync('ALTER TABLE records ADD COLUMN clientId TEXT;');
  }
  if (!names.has('serverId')) {
    await db.execAsync('ALTER TABLE records ADD COLUMN serverId TEXT;');
  }
  if (!names.has('syncStatus')) {
    await db.execAsync(
      "ALTER TABLE records ADD COLUMN syncStatus TEXT NOT NULL DEFAULT 'pending_create';",
    );
  }
  if (!names.has('updatedAt')) {
    await db.execAsync('ALTER TABLE records ADD COLUMN updatedAt TEXT;');
  }
};

const backfillSyncMetadata = async (db: SQLiteDatabase) => {
  await db.execAsync(`
    UPDATE records
    SET syncStatus = 'pending_create'
    WHERE syncStatus IS NULL OR syncStatus = '';

    UPDATE records
    SET updatedAt = createdAt
    WHERE updatedAt IS NULL OR updatedAt = '';
  `);

  const rows = await db.getAllAsync<{ id: number }>(
    'SELECT id FROM records WHERE clientId IS NULL OR clientId = ?',
    '',
  );

  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      await db.runAsync('UPDATE records SET clientId = ? WHERE id = ?', randomUUID(), row.id);
    }
  });
};

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ownerUserId TEXT,
      clientId TEXT,
      serverId TEXT,
      syncStatus TEXT NOT NULL DEFAULT 'pending_create',
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      emotions TEXT NOT NULL DEFAULT '[]',
      emotionIntensity INTEGER NOT NULL,
      decisionDifficulty INTEGER NOT NULL,
      timeCost TEXT NOT NULL,
      thoughts TEXT NOT NULL DEFAULT '',
      finalDecision TEXT NOT NULL DEFAULT '',
      worthIt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_records_category ON records(category);

    CREATE TABLE IF NOT EXISTS people_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ownerUserId TEXT,
      clientId TEXT,
      serverId TEXT,
      syncStatus TEXT NOT NULL DEFAULT 'pending_create',
      alias TEXT NOT NULL,
      emotions TEXT NOT NULL DEFAULT '[]',
      triggerScene TEXT NOT NULL DEFAULT '',
      contemptPoints TEXT NOT NULL DEFAULT '',
      inferiorityOrEnvyPoints TEXT NOT NULL DEFAULT '',
      otherStrengths TEXT NOT NULL DEFAULT '',
      myStrengths TEXT NOT NULL DEFAULT '',
      personDefinition TEXT NOT NULL DEFAULT '',
      learningAction TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_people_observations_created_at ON people_observations(createdAt DESC);
  `);

  await addSyncColumns(db);
  await backfillSyncMetadata(db);
  await db.execAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_records_client_id ON records(clientId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_records_server_id ON records(serverId);
    CREATE INDEX IF NOT EXISTS idx_records_owner_sync ON records(ownerUserId, syncStatus);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_people_observations_client_id ON people_observations(clientId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_people_observations_server_id ON people_observations(serverId);
    CREATE INDEX IF NOT EXISTS idx_people_observations_owner_sync ON people_observations(ownerUserId, syncStatus);
  `);
}

export async function claimLegacyRecords(db: SQLiteDatabase, ownerUserId: string) {
  await db.runAsync(
    'UPDATE records SET ownerUserId = ? WHERE ownerUserId IS NULL OR ownerUserId = ?',
    ownerUserId,
    '',
  );
}

export async function claimLegacyPeopleObservations(db: SQLiteDatabase, ownerUserId: string) {
  await db.runAsync(
    'UPDATE people_observations SET ownerUserId = ? WHERE ownerUserId IS NULL OR ownerUserId = ?',
    ownerUserId,
    '',
  );
}

export async function createRecord(
  db: SQLiteDatabase,
  ownerUserId: string,
  input: RecordInput,
) {
  const clientId = randomUUID();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO records (
      ownerUserId, clientId, serverId, syncStatus,
      title, category, emotions, emotionIntensity, decisionDifficulty,
      timeCost, thoughts, finalDecision, worthIt, createdAt, updatedAt
    ) VALUES (?, ?, NULL, 'pending_create', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ownerUserId,
    clientId,
    input.title.trim(),
    input.category,
    JSON.stringify(input.emotions),
    input.emotionIntensity,
    input.decisionDifficulty,
    input.timeCost,
    input.thoughts.trim(),
    input.finalDecision.trim(),
    input.worthIt,
    now,
    now,
  );

  return getRecord(db, ownerUserId, Number(result.lastInsertRowId));
}

export async function createPeopleObservation(
  db: SQLiteDatabase,
  ownerUserId: string,
  input: PeopleObservationInput,
) {
  const clientId = randomUUID();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO people_observations (
      ownerUserId, clientId, serverId, syncStatus,
      alias, emotions, triggerScene, contemptPoints, inferiorityOrEnvyPoints,
      otherStrengths, myStrengths, personDefinition, learningAction, createdAt, updatedAt
    ) VALUES (?, ?, NULL, 'pending_create', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ownerUserId,
    clientId,
    input.alias.trim(),
    JSON.stringify(input.emotions),
    input.triggerScene.trim(),
    input.contemptPoints.trim(),
    input.inferiorityOrEnvyPoints.trim(),
    input.otherStrengths.trim(),
    input.myStrengths.trim(),
    input.personDefinition.trim(),
    input.learningAction.trim(),
    now,
    now,
  );

  return getPeopleObservation(db, ownerUserId, Number(result.lastInsertRowId));
}

export async function getRecord(
  db: SQLiteDatabase,
  ownerUserId: string,
  id: number,
): Promise<DilemmaRecord | null> {
  const row = await db.getFirstAsync<RecordRow>(
    'SELECT * FROM records WHERE id = ? AND ownerUserId = ?',
    id,
    ownerUserId,
  );

  return row ? mapRow(row) : null;
}

export async function getPeopleObservation(
  db: SQLiteDatabase,
  ownerUserId: string,
  id: number,
): Promise<PeopleObservation | null> {
  const row = await db.getFirstAsync<PeopleObservationRow>(
    'SELECT * FROM people_observations WHERE id = ? AND ownerUserId = ?',
    id,
    ownerUserId,
  );

  return row ? mapPeopleObservationRow(row) : null;
}

export async function getPendingRecords(db: SQLiteDatabase, ownerUserId: string) {
  const rows = await db.getAllAsync<RecordRow>(
    "SELECT * FROM records WHERE ownerUserId = ? AND syncStatus != 'synced' ORDER BY createdAt ASC",
    ownerUserId,
  );
  return rows.map(mapRow);
}

export async function getPendingPeopleObservations(db: SQLiteDatabase, ownerUserId: string) {
  const rows = await db.getAllAsync<PeopleObservationRow>(
    "SELECT * FROM people_observations WHERE ownerUserId = ? AND syncStatus != 'synced' ORDER BY createdAt ASC",
    ownerUserId,
  );
  return rows.map(mapPeopleObservationRow);
}

export async function markRecordSynced(
  db: SQLiteDatabase,
  ownerUserId: string,
  id: number,
  serverId: string,
) {
  return db.runAsync(
    "UPDATE records SET serverId = ?, syncStatus = 'synced', updatedAt = ? WHERE id = ? AND ownerUserId = ?",
    serverId,
    new Date().toISOString(),
    id,
    ownerUserId,
  );
}

export async function markPeopleObservationSynced(
  db: SQLiteDatabase,
  ownerUserId: string,
  id: number,
  serverId: string,
) {
  return db.runAsync(
    "UPDATE people_observations SET serverId = ?, syncStatus = 'synced', updatedAt = ? WHERE id = ? AND ownerUserId = ?",
    serverId,
    new Date().toISOString(),
    id,
    ownerUserId,
  );
}

export async function markRecordPendingDelete(
  db: SQLiteDatabase,
  ownerUserId: string,
  id: number,
) {
  return db.runAsync(
    "UPDATE records SET syncStatus = 'pending_delete', updatedAt = ? WHERE id = ? AND ownerUserId = ?",
    new Date().toISOString(),
    id,
    ownerUserId,
  );
}

export async function markPeopleObservationPendingDelete(
  db: SQLiteDatabase,
  ownerUserId: string,
  id: number,
) {
  return db.runAsync(
    "UPDATE people_observations SET syncStatus = 'pending_delete', updatedAt = ? WHERE id = ? AND ownerUserId = ?",
    new Date().toISOString(),
    id,
    ownerUserId,
  );
}

export async function updateRecord(
  db: SQLiteDatabase,
  ownerUserId: string,
  id: number,
  input: RecordInput,
) {
  const current = await getRecord(db, ownerUserId, id);

  if (!current || current.syncStatus === 'pending_delete') {
    return null;
  }

  const nextSyncStatus: LocalSyncStatus =
    current.syncStatus === 'pending_create' ? 'pending_create' : 'pending_update';
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE records
     SET title = ?,
         category = ?,
         emotions = ?,
         emotionIntensity = ?,
         decisionDifficulty = ?,
         timeCost = ?,
         thoughts = ?,
         finalDecision = ?,
         worthIt = ?,
         syncStatus = ?,
         updatedAt = ?
     WHERE id = ? AND ownerUserId = ?`,
    input.title.trim(),
    input.category,
    JSON.stringify(input.emotions),
    input.emotionIntensity,
    input.decisionDifficulty,
    input.timeCost,
    input.thoughts.trim(),
    input.finalDecision.trim(),
    input.worthIt,
    nextSyncStatus,
    now,
    id,
    ownerUserId,
  );

  return getRecord(db, ownerUserId, id);
}

export async function updatePeopleObservation(
  db: SQLiteDatabase,
  ownerUserId: string,
  id: number,
  input: PeopleObservationInput,
) {
  const current = await getPeopleObservation(db, ownerUserId, id);

  if (!current || current.syncStatus === 'pending_delete') {
    return null;
  }

  const nextSyncStatus: LocalSyncStatus =
    current.syncStatus === 'pending_create' ? 'pending_create' : 'pending_update';
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE people_observations
     SET alias = ?,
         emotions = ?,
         triggerScene = ?,
         contemptPoints = ?,
         inferiorityOrEnvyPoints = ?,
         otherStrengths = ?,
         myStrengths = ?,
         personDefinition = ?,
         learningAction = ?,
         syncStatus = ?,
         updatedAt = ?
     WHERE id = ? AND ownerUserId = ?`,
    input.alias.trim(),
    JSON.stringify(input.emotions),
    input.triggerScene.trim(),
    input.contemptPoints.trim(),
    input.inferiorityOrEnvyPoints.trim(),
    input.otherStrengths.trim(),
    input.myStrengths.trim(),
    input.personDefinition.trim(),
    input.learningAction.trim(),
    nextSyncStatus,
    now,
    id,
    ownerUserId,
  );

  return getPeopleObservation(db, ownerUserId, id);
}

export async function deleteLocalRecord(
  db: SQLiteDatabase,
  ownerUserId: string,
  id: number,
) {
  return db.runAsync('DELETE FROM records WHERE id = ? AND ownerUserId = ?', id, ownerUserId);
}

export async function deleteLocalPeopleObservation(
  db: SQLiteDatabase,
  ownerUserId: string,
  id: number,
) {
  return db.runAsync('DELETE FROM people_observations WHERE id = ? AND ownerUserId = ?', id, ownerUserId);
}

export async function upsertRemoteRecord(
  db: SQLiteDatabase,
  ownerUserId: string,
  record: RemoteRecordSnapshot,
) {
  const existing = await db.getFirstAsync<Pick<RecordRow, 'id' | 'syncStatus'>>(
    'SELECT id, syncStatus FROM records WHERE ownerUserId = ? AND (serverId = ? OR clientId = ?) LIMIT 1',
    ownerUserId,
    record.serverId,
    record.clientId,
  );

  if (existing) {
    if (existing.syncStatus !== 'synced') {
      return;
    }

    await db.runAsync(
      `UPDATE records
       SET clientId = ?,
           serverId = ?,
           syncStatus = 'synced',
           title = ?,
           category = ?,
           emotions = ?,
           emotionIntensity = ?,
           decisionDifficulty = ?,
           timeCost = ?,
           thoughts = ?,
           finalDecision = ?,
           worthIt = ?,
           createdAt = ?,
           updatedAt = ?
       WHERE id = ? AND ownerUserId = ?`,
      record.clientId,
      record.serverId,
      record.title,
      record.category,
      JSON.stringify(record.emotions),
      record.emotionIntensity,
      record.decisionDifficulty,
      record.timeCost,
      record.thoughts,
      record.finalDecision,
      record.worthIt,
      record.createdAt,
      record.updatedAt,
      existing.id,
      ownerUserId,
    );
    return;
  }

  await db.runAsync(
    `INSERT INTO records (
      ownerUserId, clientId, serverId, syncStatus,
      title, category, emotions, emotionIntensity, decisionDifficulty,
      timeCost, thoughts, finalDecision, worthIt, createdAt, updatedAt
    ) VALUES (?, ?, ?, 'synced', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ownerUserId,
    record.clientId,
    record.serverId,
    record.title,
    record.category,
    JSON.stringify(record.emotions),
    record.emotionIntensity,
    record.decisionDifficulty,
    record.timeCost,
    record.thoughts,
    record.finalDecision,
    record.worthIt,
    record.createdAt,
    record.updatedAt,
  );
}

export async function upsertRemotePeopleObservation(
  db: SQLiteDatabase,
  ownerUserId: string,
  observation: RemotePeopleObservationSnapshot,
) {
  const existing = await db.getFirstAsync<Pick<PeopleObservationRow, 'id' | 'syncStatus'>>(
    'SELECT id, syncStatus FROM people_observations WHERE ownerUserId = ? AND (serverId = ? OR clientId = ?) LIMIT 1',
    ownerUserId,
    observation.serverId,
    observation.clientId,
  );

  if (existing) {
    if (existing.syncStatus !== 'synced') {
      return;
    }

    await db.runAsync(
      `UPDATE people_observations
       SET clientId = ?,
           serverId = ?,
           syncStatus = 'synced',
           alias = ?,
           emotions = ?,
           triggerScene = ?,
           contemptPoints = ?,
           inferiorityOrEnvyPoints = ?,
           otherStrengths = ?,
           myStrengths = ?,
           personDefinition = ?,
           learningAction = ?,
           createdAt = ?,
           updatedAt = ?
       WHERE id = ? AND ownerUserId = ?`,
      observation.clientId,
      observation.serverId,
      observation.alias,
      JSON.stringify(observation.emotions),
      observation.triggerScene,
      observation.contemptPoints,
      observation.inferiorityOrEnvyPoints,
      observation.otherStrengths,
      observation.myStrengths,
      observation.personDefinition,
      observation.learningAction,
      observation.createdAt,
      observation.updatedAt,
      existing.id,
      ownerUserId,
    );
    return;
  }

  await db.runAsync(
    `INSERT INTO people_observations (
      ownerUserId, clientId, serverId, syncStatus,
      alias, emotions, triggerScene, contemptPoints, inferiorityOrEnvyPoints,
      otherStrengths, myStrengths, personDefinition, learningAction, createdAt, updatedAt
    ) VALUES (?, ?, ?, 'synced', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ownerUserId,
    observation.clientId,
    observation.serverId,
    observation.alias,
    JSON.stringify(observation.emotions),
    observation.triggerScene,
    observation.contemptPoints,
    observation.inferiorityOrEnvyPoints,
    observation.otherStrengths,
    observation.myStrengths,
    observation.personDefinition,
    observation.learningAction,
    observation.createdAt,
    observation.updatedAt,
  );
}

const getDateRangeStart = (dateRange: DateRange) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (dateRange === 'week') {
    start.setDate(start.getDate() - 6);
  }

  if (dateRange === 'month') {
    start.setDate(start.getDate() - 29);
  }

  return start.toISOString();
};

export async function getRecords(
  db: SQLiteDatabase,
  ownerUserId: string,
  filters: RecordFilters = {},
) {
  const clauses = ["ownerUserId = ?", "syncStatus != 'pending_delete'"];
  const params: Array<string | number> = [ownerUserId];

  if (filters.category) {
    clauses.push('category = ?');
    params.push(filters.category);
  }
  if (filters.emotion) {
    clauses.push('emotions LIKE ?');
    params.push(`%"${filters.emotion}"%`);
  }
  if (filters.dateRange) {
    clauses.push('createdAt >= ?');
    params.push(getDateRangeStart(filters.dateRange));
  }
  if (filters.search?.trim()) {
    clauses.push('(title LIKE ? OR thoughts LIKE ?)');
    const search = `%${filters.search.trim()}%`;
    params.push(search, search);
  }

  const rows = await db.getAllAsync<RecordRow>(
    `SELECT * FROM records WHERE ${clauses.join(' AND ')} ORDER BY createdAt DESC`,
    ...params,
  );
  return rows.map(mapRow);
}

export async function getPeopleObservations(
  db: SQLiteDatabase,
  ownerUserId: string,
  filters: PeopleObservationFilters = {},
) {
  const clauses = ["ownerUserId = ?", "syncStatus != 'pending_delete'"];
  const params: Array<string | number> = [ownerUserId];

  if (filters.search?.trim()) {
    clauses.push(
      '(alias LIKE ? OR triggerScene LIKE ? OR contemptPoints LIKE ? OR inferiorityOrEnvyPoints LIKE ? OR otherStrengths LIKE ? OR myStrengths LIKE ?)',
    );
    const search = `%${filters.search.trim()}%`;
    params.push(search, search, search, search, search, search);
  }

  const rows = await db.getAllAsync<PeopleObservationRow>(
    `SELECT * FROM people_observations WHERE ${clauses.join(' AND ')} ORDER BY createdAt DESC`,
    ...params,
  );
  return rows.map(mapPeopleObservationRow);
}

export const isPendingDelete = (status: LocalSyncStatus) => status === 'pending_delete';
