import { Category, DilemmaRecord, Emotion } from '../types/record';

export const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export function mostCommon<T extends string>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function getTodayRecords(records: DilemmaRecord[]) {
  const today = new Date().toDateString();
  return records.filter((record) => new Date(record.createdAt).toDateString() === today);
}

export function calculateStats(records: DilemmaRecord[]) {
  return {
    total: records.length,
    commonCategory: mostCommon<Category>(records.map((record) => record.category)),
    commonEmotion: mostCommon<Emotion>(records.flatMap((record) => record.emotions)),
    averageEmotionIntensity: average(records.map((record) => record.emotionIntensity)),
    averageDecisionDifficulty: average(records.map((record) => record.decisionDifficulty)),
    hardestRecords: [...records]
      .sort(
        (a, b) =>
          b.emotionIntensity +
          b.decisionDifficulty -
          (a.emotionIntensity + a.decisionDifficulty),
      )
      .slice(0, 5),
  };
}
