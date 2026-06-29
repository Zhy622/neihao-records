import { LocalSyncStatus } from './record';

export const PEOPLE_OBSERVATION_EMOTIONS = [
  '轻蔑',
  '自卑',
  '嫉妒',
  '不服气',
  '羡慕',
  '佩服',
  '其他',
] as const;

export type PeopleObservationEmotion = (typeof PEOPLE_OBSERVATION_EMOTIONS)[number];

export interface PeopleObservationInput {
  alias: string;
  emotions: PeopleObservationEmotion[];
  triggerScene: string;
  contemptPoints: string;
  inferiorityOrEnvyPoints: string;
  otherStrengths: string;
  myStrengths: string;
  personDefinition: string;
  learningAction: string;
}

export interface PeopleObservation extends PeopleObservationInput {
  id: number;
  ownerUserId: string;
  clientId: string;
  serverId: string | null;
  syncStatus: LocalSyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PeopleObservationFilters {
  search?: string;
}
