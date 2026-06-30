import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { getPeopleObservations } from '../database/database';
import { syncPeopleObservations } from '../sync/people-observations-sync';
import {
  consumePendingPeopleObservationAnimationIds,
  filterCachedPeopleObservations,
  getCachedPeopleObservations,
  setCachedPeopleObservations,
} from '../cache/people-observations-cache';
import {
  PeopleObservation,
  PeopleObservationFilters,
} from '../types/people-observation';

export function usePeopleObservations(filters: PeopleObservationFilters = {}) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const [peopleObservations, setPeopleObservations] = useState<PeopleObservation[]>([]);
  const [animatedObservationIds, setAnimatedObservationIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const search = filters.search;
  const userId = session?.user.id;

  const refresh = useCallback(async () => {
    if (!userId) {
      setPeopleObservations([]);
      setAnimatedObservationIds(new Set());
      hasLoadedRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    const cached = getCachedPeopleObservations(userId);
    if (cached) {
      const filteredObservations = filterCachedPeopleObservations(cached, { search });
      setPeopleObservations(filteredObservations);
      setAnimatedObservationIds(
        consumePendingPeopleObservationAnimationIds(userId, filteredObservations),
      );
      hasLoadedRef.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      setIsLoading(true);
      try {
        await syncPeopleObservations(db, userId);
      } catch {
        // Local observations remain available while a background sync attempt fails.
      }
      const observations = await getPeopleObservations(db, userId);
      setCachedPeopleObservations(userId, observations);
      const filteredObservations = filterCachedPeopleObservations(observations, { search });
      setPeopleObservations(filteredObservations);
      setAnimatedObservationIds(
        consumePendingPeopleObservationAnimationIds(userId, filteredObservations),
      );
      hasLoadedRef.current = true;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [db, search, userId]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return { peopleObservations, animatedObservationIds, refresh, isLoading, isRefreshing };
}
