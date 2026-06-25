import { apiRequest, ApiError } from './client';
import {
  Category,
  DilemmaRecord,
  Emotion,
  TimeCost,
  WorthIt,
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
  clientId: string | null;
  syncStatus: 'ACTIVE' | 'DELETED';
}

interface RemoteRecordsPage {
  records: RemoteRecord[];
  total: number;
  limit: number;
  offset: number;
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

export const isRemoteConflict = (error: unknown) =>
  error instanceof ApiError && error.status === 409;

export const isRemoteMissing = (error: unknown) =>
  error instanceof ApiError && error.status === 404;
