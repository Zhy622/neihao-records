import { apiRequest, ApiError } from './client';
import {
  PEOPLE_OBSERVATION_EMOTIONS,
  PeopleObservation,
  PeopleObservationEmotion,
} from '../types/people-observation';

type ApiPeopleObservationEmotion =
  | 'CONTEMPT'
  | 'INFERIORITY'
  | 'JEALOUSY'
  | 'DEFIANT'
  | 'ENVY'
  | 'ADMIRATION'
  | 'OTHER';

export interface RemotePeopleObservation {
  id: string;
  userId: string;
  clientId: string | null;
  alias: string;
  emotions: ApiPeopleObservationEmotion[];
  triggerScene: string;
  contemptPoints: string;
  inferiorityOrEnvyPoints: string;
  otherStrengths: string;
  myStrengths: string;
  personDefinition: string;
  learningAction: string;
  syncStatus: 'ACTIVE' | 'DELETED';
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface RemotePeopleObservationsPage {
  peopleObservations: RemotePeopleObservation[];
  total: number;
  limit: number;
  offset: number;
}

const emotionMap: Record<PeopleObservationEmotion, ApiPeopleObservationEmotion> = {
  轻蔑: 'CONTEMPT',
  自卑: 'INFERIORITY',
  嫉妒: 'JEALOUSY',
  不服气: 'DEFIANT',
  羡慕: 'ENVY',
  佩服: 'ADMIRATION',
  其他: 'OTHER',
};

const localEmotionMap: Record<ApiPeopleObservationEmotion, PeopleObservationEmotion> = {
  CONTEMPT: PEOPLE_OBSERVATION_EMOTIONS[0],
  INFERIORITY: PEOPLE_OBSERVATION_EMOTIONS[1],
  JEALOUSY: PEOPLE_OBSERVATION_EMOTIONS[2],
  DEFIANT: PEOPLE_OBSERVATION_EMOTIONS[3],
  ENVY: PEOPLE_OBSERVATION_EMOTIONS[4],
  ADMIRATION: PEOPLE_OBSERVATION_EMOTIONS[5],
  OTHER: PEOPLE_OBSERVATION_EMOTIONS[6],
};

export function createRemotePeopleObservation(observation: PeopleObservation) {
  return apiRequest<RemotePeopleObservation>('/people-observations', {
    method: 'POST',
    body: {
      clientId: observation.clientId,
      alias: observation.alias,
      emotions: observation.emotions.map((emotion) => emotionMap[emotion]),
      triggerScene: observation.triggerScene,
      contemptPoints: observation.contemptPoints,
      inferiorityOrEnvyPoints: observation.inferiorityOrEnvyPoints,
      otherStrengths: observation.otherStrengths,
      myStrengths: observation.myStrengths,
      personDefinition: observation.personDefinition,
      learningAction: observation.learningAction,
      createdAt: observation.createdAt,
    },
  });
}

export function updateRemotePeopleObservation(serverId: string, observation: PeopleObservation) {
  return apiRequest<RemotePeopleObservation>(`/people-observations/${serverId}`, {
    method: 'PATCH',
    body: {
      alias: observation.alias,
      emotions: observation.emotions.map((emotion) => emotionMap[emotion]),
      triggerScene: observation.triggerScene,
      contemptPoints: observation.contemptPoints,
      inferiorityOrEnvyPoints: observation.inferiorityOrEnvyPoints,
      otherStrengths: observation.otherStrengths,
      myStrengths: observation.myStrengths,
      personDefinition: observation.personDefinition,
      learningAction: observation.learningAction,
    },
  });
}

export function deleteRemotePeopleObservation(serverId: string) {
  return apiRequest<RemotePeopleObservation>(`/people-observations/${serverId}`, { method: 'DELETE' });
}

export async function findRemotePeopleObservationByClientId(clientId: string) {
  const pageSize = 200;

  for (let offset = 0; ; offset += pageSize) {
    const page = await apiRequest<RemotePeopleObservationsPage>(
      `/people-observations?includeDeleted=true&limit=${pageSize}&offset=${offset}`,
    );
    const observation = page.peopleObservations.find((item) => item.clientId === clientId);

    if (observation) {
      return observation;
    }

    if (offset + page.peopleObservations.length >= page.total) {
      return null;
    }
  }
}

export async function fetchRemotePeopleObservations() {
  const pageSize = 200;
  const peopleObservations: RemotePeopleObservation[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const page = await apiRequest<RemotePeopleObservationsPage>(
      `/people-observations?limit=${pageSize}&offset=${offset}`,
    );
    peopleObservations.push(...page.peopleObservations);

    if (offset + page.peopleObservations.length >= page.total) {
      return peopleObservations;
    }
  }
}

export const toLocalPeopleObservationSnapshot = (observation: RemotePeopleObservation) => ({
  clientId: observation.clientId ?? observation.id,
  serverId: observation.id,
  alias: observation.alias,
  emotions: observation.emotions.map((emotion) => localEmotionMap[emotion]),
  triggerScene: observation.triggerScene,
  contemptPoints: observation.contemptPoints,
  inferiorityOrEnvyPoints: observation.inferiorityOrEnvyPoints,
  otherStrengths: observation.otherStrengths,
  myStrengths: observation.myStrengths,
  personDefinition: observation.personDefinition,
  learningAction: observation.learningAction,
  createdAt: observation.createdAt,
  updatedAt: observation.updatedAt,
});

export const isRemoteConflict = (error: unknown) =>
  error instanceof ApiError && error.status === 409;

export const isRemoteMissing = (error: unknown) =>
  error instanceof ApiError && error.status === 404;
