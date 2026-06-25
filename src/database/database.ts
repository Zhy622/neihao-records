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

type RecordRow = Omit<DilemmaRecord, 'emotions'> & { emotions: string };
type TableColumn = { name: string };

const mapRow = (row: RecordRow): DilemmaRecord => ({
  ...row,
  emotions: JSON.parse(row.emotions) as Emotion[],
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
  `);

  await addSyncColumns(db);
  await backfillSyncMetadata(db);
  await db.execAsync(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_records_client_id ON records(clientId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_records_server_id ON records(serverId);
    CREATE INDEX IF NOT EXISTS idx_records_owner_sync ON records(ownerUserId, syncStatus);
  `);
}

export async function claimLegacyRecords(db: SQLiteDatabase, ownerUserId: string) {
  await db.runAsync(
    'UPDATE records SET ownerUserId = ? WHERE ownerUserId IS NULL OR ownerUserId = ?',
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

export async function getPendingRecords(db: SQLiteDatabase, ownerUserId: string) {
  const rows = await db.getAllAsync<RecordRow>(
    "SELECT * FROM records WHERE ownerUserId = ? AND syncStatus != 'synced' ORDER BY createdAt ASC",
    ownerUserId,
  );
  return rows.map(mapRow);
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

export async function deleteLocalRecord(
  db: SQLiteDatabase,
  ownerUserId: string,
  id: number,
) {
  return db.runAsync('DELETE FROM records WHERE id = ? AND ownerUserId = ?', id, ownerUserId);
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

export const isPendingDelete = (status: LocalSyncStatus) => status === 'pending_delete';
