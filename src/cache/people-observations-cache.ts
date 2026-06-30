import {
  PeopleObservation,
  PeopleObservationFilters,
} from '../types/people-observation';

const observationCache = new Map<string, PeopleObservation[]>();
const observationAnimationIds = new Map<string, Set<number>>();

const sortByCreatedAtDesc = (items: PeopleObservation[]) =>
  [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);

export function getCachedPeopleObservations(ownerUserId: string) {
  return observationCache.get(ownerUserId);
}

export function setCachedPeopleObservations(
  ownerUserId: string,
  observations: PeopleObservation[],
) {
  const hadCache = observationCache.has(ownerUserId);
  observationCache.set(ownerUserId, sortByCreatedAtDesc(observations));

  if (!hadCache && observations.length) {
    observationAnimationIds.set(
      ownerUserId,
      new Set(observations.map((observation) => observation.id)),
    );
  }
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

export function upsertPeopleObservationCache(
  ownerUserId: string,
  observation: PeopleObservation,
  options: { animate?: boolean } = {},
) {
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

  if (options.animate !== false) {
    const currentAnimationIds = observationAnimationIds.get(ownerUserId) ?? new Set<number>();
    currentAnimationIds.add(observation.id);
    observationAnimationIds.set(ownerUserId, currentAnimationIds);
  }
}

export function removePeopleObservationCache(ownerUserId: string, id: number) {
  const current = observationCache.get(ownerUserId);
  if (!current) {
    return;
  }

  observationCache.set(ownerUserId, current.filter((item) => item.id !== id));
  observationAnimationIds.get(ownerUserId)?.delete(id);
}

export function consumePendingPeopleObservationAnimationIds(
  ownerUserId: string,
  observations: PeopleObservation[],
) {
  const pendingIds = observationAnimationIds.get(ownerUserId);
  if (!pendingIds?.size) {
    return new Set<number>();
  }

  const visibleIds = new Set(observations.map((observation) => observation.id));
  const consumedIds = new Set<number>();

  pendingIds.forEach((id) => {
    if (visibleIds.has(id)) {
      consumedIds.add(id);
      pendingIds.delete(id);
    }
  });

  if (!pendingIds.size) {
    observationAnimationIds.delete(ownerUserId);
  }

  return consumedIds;
}

export function clearPeopleObservationCache() {
  observationCache.clear();
  observationAnimationIds.clear();
}
