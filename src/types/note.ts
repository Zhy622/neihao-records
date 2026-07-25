import { LocalSyncStatus } from './record';

export const NOTE_TYPES = ['暂不分类', '一个想法', '一件事情', '一段感受', '一个灵感', '一个发现'] as const;
export const NOTE_EMOTIONS = ['开心', '平静', '轻松', '兴奋', '投入', '满足', '焦虑', '压抑', '愤怒', '悲伤', '疲惫', '迷茫'] as const;
export const NOTE_CATEGORIES = ['积极的', '负面的', '让我快乐的', '让我消耗的', '外界影响', '内心真实想法', '暂时不确定'] as const;

export type NoteType = (typeof NOTE_TYPES)[number];
export type NoteEmotion = (typeof NOTE_EMOTIONS)[number];
export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

export interface NoteInput {
  content: string;
  noteType: NoteType;
  emotions: NoteEmotion[];
  categories: NoteCategory[];
}

export interface Note extends NoteInput {
  id: number;
  ownerUserId: string;
  clientId: string;
  serverId: string | null;
  syncStatus: LocalSyncStatus;
  createdAt: string;
  updatedAt: string;
}
