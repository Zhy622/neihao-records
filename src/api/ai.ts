import { apiRequest } from './client';

export interface RecordInsightResult {
  summary: string;
  coreConflict: string;
  gentleQuestion: string;
  nextAction: string;
}

export interface RecordInsightResponse {
  id: string;
  recordId: string;
  type: string;
  provider: string;
  model: string;
  promptVersion: string;
  result: RecordInsightResult;
  createdAt: string;
}

export function createRecordInsight(recordId: string) {
  return apiRequest<RecordInsightResponse>(`/ai/records/${recordId}/insight`, {
    method: 'POST',
    body: {},
  });
}
