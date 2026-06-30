import {
  PeopleObservation,
  PeopleObservationFilters,
} from '../types/people-observation';

const observationCache = new Map<string, PeopleObservation[]>();

const sortByCreatedAtDesc = (items: PeopleObservation[]) =>
  [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);

export function getCachedPeopleObservations(ownerUserId: string) {
  return observationCache.get(ownerUserId);
}

export function setCachedPeopleObservations(
  ownerUserId: string,
  observations: PeopleObservation[],
) {
  observationCache.set(ownerUserId, sortByCreatedAtDesc(observations));
}

export function filterCachedPeopleObservations(
  observations: PeopleObservation[],
  filters: PeopleObservationFilters = {},
) {
  const search = filters.search?.trim();

  if (!search) {
    return observations;
  }

  return observations.filter((observation) =>
    [
      observation.alias,
      observation.triggerScene,
      observation.contemptPoints,
      observation.inferiorityOrEnvyPoints,
      observation.otherStrengths,
      observation.myStrengths,
      observation.personDefinition,
      observation.learningAction,
    ].some((value) => value.includes(search)),
  );
}

export function upsertPeopleObservationCache(ownerUserId: string, observation: PeopleObservation) {
  const current = observationCache.get(ownerUserId);
  if (!current) {
    return;
  }

  observationCache.set(
    ownerUserId,
    sortByCreatedAtDesc([
      observation,
      ...current.filter((item) => item.id !== observation.id),
    ]),
  );
}

export function removePeopleObservationCache(ownerUserId: string, id: number) {
  const current = observationCache.get(ownerUserId);
  if (!current) {
    return;
  }

  observationCache.set(ownerUserId, current.filter((item) => item.id !== id));
}

export function clearPeopleObservationCache() {
  observationCache.clear();
}
