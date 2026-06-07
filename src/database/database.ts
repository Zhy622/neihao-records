import { SQLiteDatabase } from 'expo-sqlite';
import { DilemmaRecord, Emotion, RecordFilters, RecordInput } from '../types/record';

type RecordRow = Omit<DilemmaRecord, 'emotions'> & { emotions: string };

const mapRow = (row: RecordRow): DilemmaRecord => ({
  ...row,
  emotions: JSON.parse(row.emotions) as Emotion[],
});

export async function initializeDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      emotions TEXT NOT NULL DEFAULT '[]',
      emotionIntensity INTEGER NOT NULL,
      decisionDifficulty INTEGER NOT NULL,
      timeCost TEXT NOT NULL,
      thoughts TEXT NOT NULL DEFAULT '',
      finalDecision TEXT NOT NULL DEFAULT '',
      worthIt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_records_category ON records(category);
  `);
}

export async function createRecord(db: SQLiteDatabase, input: RecordInput) {
  return db.runAsync(
    `INSERT INTO records (
      title, category, emotions, emotionIntensity, decisionDifficulty,
      timeCost, thoughts, finalDecision, worthIt, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.title.trim(),
    input.category,
    JSON.stringify(input.emotions),
    input.emotionIntensity,
    input.decisionDifficulty,
    input.timeCost,
    input.thoughts.trim(),
    input.finalDecision.trim(),
    input.worthIt,
    new Date().toISOString(),
  );
}

export async function getRecords(db: SQLiteDatabase, filters: RecordFilters = {}) {
  const clauses: string[] = [];
  const params: string[] = [];

  if (filters.category) {
    clauses.push('category = ?');
    params.push(filters.category);
  }
  if (filters.search?.trim()) {
    clauses.push('(title LIKE ? OR thoughts LIKE ?)');
    const search = `%${filters.search.trim()}%`;
    params.push(search, search);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await db.getAllAsync<RecordRow>(
    `SELECT * FROM records ${where} ORDER BY createdAt DESC`,
    ...params,
  );
  return rows.map(mapRow);
}

export async function deleteRecord(db: SQLiteDatabase, id: number) {
  return db.runAsync('DELETE FROM records WHERE id = ?', id);
}
