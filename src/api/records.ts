import { apiRequest, ApiError } from './client';
import {
  CATEGORIES,
  Category,
  DilemmaRecord,
  Emotion,
  EMOTIONS,
  TIME_COSTS,
  TimeCost,
  WORTH_OPTIONS,
  WorthIt,
  DateRange,
  RecordFilters,
} from '../types/record';

type ApiCategory =
  | 'WORK'
  | 'STUDY'
  | 'RELATIONSHIP'
  | 'CONSUMPTION'
  | 'CHOICE'
  | 'EMOTION'
  | 'OTHER';
type ApiEmotion =
  | 'ANXIETY'
  | 'OVERTHINKING'
  | 'FEAR'
  | 'GRIEVANCE'
  | 'ANGER'
  | 'AVOIDANCE'
  | 'BLANK';
type ApiTimeCost =
  | 'WITHIN_5_MINUTES'
  | 'WITHIN_30_MINUTES'
  | 'WITHIN_1_HOUR'
  | 'HALF_DAY'
  | 'OVER_1_DAY';
type ApiWorthIt = 'WORTH_IT' | 'NOT_WORTH_IT' | 'UNCLEAR';

export interface RemoteRecord {
  id: string;
  userId: string;
  clientId: string | null;
  title: string;
  category: ApiCategory;
  emotions: ApiEmotion[];
  emotionIntensity: number;
  decisionDifficulty: number;
  timeCost: ApiTimeCost;
  thoughts: string;
  finalDecision: string;
  worthIt: ApiWorthIt;
  syncStatus: 'ACTIVE' | 'DELETED';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface RemoteRecordsPage {
  records: RemoteRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface RemoteRecordsPageOptions {
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
  filters?: RecordFilters;
}

const categoryMap: Record<Category, ApiCategory> = {
  工作: 'WORK',
  学习: 'STUDY',
  人际: 'RELATIONSHIP',
  消费: 'CONSUMPTION',
  选择: 'CHOICE',
  情绪: 'EMOTION',
  其他: 'OTHER',
};

const emotionMap: Record<Emotion, ApiEmotion> = {
  焦虑: 'ANXIETY',
  内耗: 'OVERTHINKING',
  害怕: 'FEAR',
  委屈: 'GRIEVANCE',
  愤怒: 'ANGER',
  逃避: 'AVOIDANCE',
  空白: 'BLANK',
};

const timeCostMap: Record<TimeCost, ApiTimeCost> = {
  '5分钟以内': 'WITHIN_5_MINUTES',
  '30分钟以内': 'WITHIN_30_MINUTES',
  '1小时以内': 'WITHIN_1_HOUR',
  半天: 'HALF_DAY',
  一天以上: 'OVER_1_DAY',
};

const worthItMap: Record<WorthIt, ApiWorthIt> = {
  值得: 'WORTH_IT',
  不值得: 'NOT_WORTH_IT',
  说不清: 'UNCLEAR',
};

const localCategoryMap: Record<ApiCategory, Category> = {
  WORK: CATEGORIES[0],
  STUDY: CATEGORIES[1],
  RELATIONSHIP: CATEGORIES[2],
  CONSUMPTION: CATEGORIES[3],
  CHOICE: CATEGORIES[4],
  EMOTION: CATEGORIES[5],
  OTHER: CATEGORIES[6],
};

const localEmotionMap: Record<ApiEmotion, Emotion> = {
  ANXIETY: EMOTIONS[0],
  OVERTHINKING: EMOTIONS[1],
  FEAR: EMOTIONS[2],
  GRIEVANCE: EMOTIONS[3],
  ANGER: EMOTIONS[4],
  AVOIDANCE: EMOTIONS[5],
  BLANK: EMOTIONS[6],
};

const localTimeCostMap: Record<ApiTimeCost, TimeCost> = {
  WITHIN_5_MINUTES: TIME_COSTS[0],
  WITHIN_30_MINUTES: TIME_COSTS[1],
  WITHIN_1_HOUR: TIME_COSTS[2],
  HALF_DAY: TIME_COSTS[3],
  OVER_1_DAY: TIME_COSTS[4],
};

const localWorthItMap: Record<ApiWorthIt, WorthIt> = {
  WORTH_IT: WORTH_OPTIONS[0],
  NOT_WORTH_IT: WORTH_OPTIONS[1],
  UNCLEAR: WORTH_OPTIONS[2],
};

export function createRemoteRecord(record: DilemmaRecord) {
  return apiRequest<RemoteRecord>('/records', {
    method: 'POST',
    body: {
      clientId: record.clientId,
      title: record.title,
      category: categoryMap[record.category],
      emotions: record.emotions.map((emotion) => emotionMap[emotion]),
      emotionIntensity: record.emotionIntensity,
      decisionDifficulty: record.decisionDifficulty,
      timeCost: timeCostMap[record.timeCost],
      thoughts: record.thoughts,
      finalDecision: record.finalDecision,
      worthIt: worthItMap[record.worthIt],
      createdAt: record.createdAt,
    },
  });
}

export function deleteRemoteRecord(serverId: string) {
  return apiRequest<RemoteRecord>(`/records/${serverId}`, { method: 'DELETE' });
}

export function updateRemoteRecord(serverId: string, input: DilemmaRecord) {
  return apiRequest<RemoteRecord>(`/records/${serverId}`, {
    method: 'PATCH',
    body: {
      title: input.title,
      category: categoryMap[input.category],
      emotions: input.emotions.map((emotion) => emotionMap[emotion]),
      emotionIntensity: input.emotionIntensity,
      decisionDifficulty: input.decisionDifficulty,
      timeCost: timeCostMap[input.timeCost],
      thoughts: input.thoughts,
      finalDecision: input.finalDecision,
      worthIt: worthItMap[input.worthIt],
    },
  });
}

export async function findRemoteRecordByClientId(clientId: string) {
  const pageSize = 200;

  for (let offset = 0; ; offset += pageSize) {
    const page = await apiRequest<RemoteRecordsPage>(
      `/records?includeDeleted=true&limit=${pageSize}&offset=${offset}`,
    );
    const record = page.records.find((item) => item.clientId === clientId);

    if (record) {
      return record;
    }

    if (offset + page.records.length >= page.total) {
      return null;
    }
  }
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

const buildRecordsQuery = ({
  includeDeleted,
  limit = 10,
  offset = 0,
  filters = {},
}: RemoteRecordsPageOptions = {}) => {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  if (includeDeleted) {
    params.set('includeDeleted', 'true');
  }
  if (filters.category) {
    params.set('category', categoryMap[filters.category]);
  }
  if (filters.emotion) {
    params.set('emotion', emotionMap[filters.emotion]);
  }
  if (filters.dateRange) {
    params.set('createdSince', getDateRangeStart(filters.dateRange));
  }
  if (filters.search?.trim()) {
    params.set('search', filters.search.trim());
  }

  return params.toString();
};

export function fetchRemoteRecordsPage(options: RemoteRecordsPageOptions = {}) {
  return apiRequest<RemoteRecordsPage>(`/records?${buildRecordsQuery(options)}`);
}

export async function fetchRemoteRecords() {
  const pageSize = 200;
  const records: RemoteRecord[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchRemoteRecordsPage({ limit: pageSize, offset });
    records.push(...page.records);

    if (offset + page.records.length >= page.total) {
      return records;
    }
  }
}

export const toLocalRecordSnapshot = (record: RemoteRecord) => ({
  clientId: record.clientId ?? record.id,
  serverId: record.id,
  title: record.title,
  category: localCategoryMap[record.category],
  emotions: record.emotions.map((emotion) => localEmotionMap[emotion]),
  emotionIntensity: record.emotionIntensity,
  decisionDifficulty: record.decisionDifficulty,
  timeCost: localTimeCostMap[record.timeCost],
  thoughts: record.thoughts,
  finalDecision: record.finalDecision,
  worthIt: localWorthItMap[record.worthIt],
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

export const isRemoteConflict = (error: unknown) =>
  error instanceof ApiError && error.status === 409;

export const isRemoteMissing = (error: unknown) =>
  error instanceof ApiError && error.status === 404;
