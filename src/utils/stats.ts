import { Category, DilemmaRecord, Emotion, TimeCost, WorthIt } from '../types/record';

export const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export function mostCommon<T extends string>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

export function countBy<T extends string>(values: T[]) {
  const counts = new Map<T, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function getMostDifficultCategory(records: DilemmaRecord[]) {
  const groups = new Map<Category, { total: number; count: number }>();

  records.forEach((record) => {
    const current = groups.get(record.category) ?? { total: 0, count: 0 };
    current.total += record.emotionIntensity + record.decisionDifficulty;
    current.count += 1;
    groups.set(record.category, current);
  });

  return [...groups.entries()]
    .map(([category, value]) => ({ category, average: value.total / value.count }))
    .sort((a, b) => b.average - a.average)[0];
}

export function getTodayRecords(records: DilemmaRecord[]) {
  const today = new Date().toDateString();
  return records.filter((record) => new Date(record.createdAt).toDateString() === today);
}

export function calculateStats(records: DilemmaRecord[]) {
  const categoryCounts = countBy<Category>(records.map((record) => record.category));
  const emotionCounts = countBy<Emotion>(records.flatMap((record) => record.emotions));
  const worthItCounts = countBy<WorthIt>(records.map((record) => record.worthIt));

  return {
    total: records.length,
    commonCategory: categoryCounts[0]?.label,
    commonEmotion: emotionCounts[0]?.label,
    commonTimeCost: mostCommon<TimeCost>(records.map((record) => record.timeCost)),
    unclearWorthCount: worthItCounts.find((item) => item.label === '说不清')?.count ?? 0,
    categoryCounts: categoryCounts.slice(0, 3),
    emotionCounts: emotionCounts.slice(0, 3),
    mostDifficultCategory: getMostDifficultCategory(records),
    averageEmotionIntensity: average(records.map((record) => record.emotionIntensity)),
    averageDecisionDifficulty: average(records.map((record) => record.decisionDifficulty)),
    hardestRecords: [...records]
      .sort(
        (a, b) =>
          b.emotionIntensity +
          b.decisionDifficulty -
          (a.emotionIntensity + a.decisionDifficulty),
      )
      .slice(0, 3),
  };
}
