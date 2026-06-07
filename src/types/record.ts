export const CATEGORIES = ['工作', '学习', '人际', '消费', '选择', '情绪', '其他'] as const;
export const EMOTIONS = ['焦虑', '内耗', '害怕', '委屈', '愤怒', '逃避', '空白'] as const;
export const TIME_COSTS = ['5分钟以内', '30分钟以内', '1小时以内', '半天', '一天以上'] as const;
export const WORTH_OPTIONS = ['值得', '不值得', '说不清'] as const;

export type Category = (typeof CATEGORIES)[number];
export type Emotion = (typeof EMOTIONS)[number];
export type TimeCost = (typeof TIME_COSTS)[number];
export type WorthIt = (typeof WORTH_OPTIONS)[number];

export interface RecordInput {
  title: string;
  category: Category;
  emotions: Emotion[];
  emotionIntensity: number;
  decisionDifficulty: number;
  timeCost: TimeCost;
  thoughts: string;
  finalDecision: string;
  worthIt: WorthIt;
}

export interface DilemmaRecord extends RecordInput {
  id: number;
  createdAt: string;
}

export interface RecordFilters {
  category?: Category;
  search?: string;
}
