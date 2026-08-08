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

const PAGE_SIZE = 10;

export function usePeopleObservations(filters: PeopleObservationFilters = {}) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const [peopleObservations, setPeopleObservations] = useState<PeopleObservation[]>([]);
  const [animatedObservationIds, setAnimatedObservationIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const hasLoadedRef = useRef(false);
  const loadedLimitRef = useRef(PAGE_SIZE);
  const remoteTotalRef = useRef<number | null>(null);
  const filterKeyRef = useRef('');
  const search = filters.search;
  const userId = session?.user.id;
  const filterKey = search ?? '';

  const refresh = useCallback(async () => {
    if (!userId) {
      setPeopleObservations([]);
      setAnimatedObservationIds(new Set());
      setHasMore(false);
      hasLoadedRef.current = false;
      loadedLimitRef.current = PAGE_SIZE;
      remoteTotalRef.current = null;
      filterKeyRef.current = '';
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
      return;
    }

    if (filterKeyRef.current !== filterKey) {
      filterKeyRef.current = filterKey;
      hasLoadedRef.current = false;
      loadedLimitRef.current = PAGE_SIZE;
      remoteTotalRef.current = null;
      setPeopleObservations([]);
    }

    const cached = getCachedPeopleObservations(userId);
    if (!hasLoadedRef.current && cached) {
      const cachedPage = filterCachedPeopleObservations(cached, { search }).slice(0, PAGE_SIZE);
      setPeopleObservations(cachedPage);
      setAnimatedObservationIds(
        consumePendingPeopleObservationAnimationIds(userId, cachedPage),
      );
    }

    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const refreshLimit = isInitialLoad ? PAGE_SIZE : loadedLimitRef.current;

      try {
        const result = await syncPeopleObservations(db, userId, {
          filters: { search },
          limit: refreshLimit,
          offset: 0,
        });
        remoteTotalRef.current = result.remoteTotal ?? remoteTotalRef.current;
      } catch {
        // Local observations remain available while a background sync attempt fails.
      }
      const observations = await getPeopleObservations(
        db,
        userId,
        { search },
        { limit: refreshLimit },
      );
      loadedLimitRef.current = refreshLimit;
      setCachedPeopleObservations(userId, observations);
      setPeopleObservations(observations);
      setAnimatedObservationIds(
        consumePendingPeopleObservationAnimationIds(userId, observations),
      );
      setHasMore(
        remoteTotalRef.current === null
          ? observations.length >= loadedLimitRef.current
          : loadedLimitRef.current < remoteTotalRef.current,
      );
      hasLoadedRef.current = true;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [db, filterKey, search, userId]);

  const loadMore = useCallback(async () => {
    if (!userId || isLoading || isRefreshing || isLoadingMore || !hasMore) {
      return;
    }

    const offset = loadedLimitRef.current;
    setIsLoadingMore(true);

    try {
      try {
        const result = await syncPeopleObservations(db, userId, {
          filters: { search },
          limit: PAGE_SIZE,
          offset,
        });
        remoteTotalRef.current = result.remoteTotal ?? remoteTotalRef.current;
      } catch {
        // Local observations remain available while a background sync attempt fails.
      }

      loadedLimitRef.current = offset + PAGE_SIZE;
      const observations = await getPeopleObservations(
        db,
        userId,
        { search },
        { limit: loadedLimitRef.current },
      );
      setCachedPeopleObservations(userId, observations);
      setPeopleObservations(observations);
      setAnimatedObservationIds(
        consumePendingPeopleObservationAnimationIds(userId, observations),
      );
      setHasMore(
        remoteTotalRef.current === null
          ? observations.length >= loadedLimitRef.current
          : loadedLimitRef.current < remoteTotalRef.current,
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [db, hasMore, isLoading, isLoadingMore, isRefreshing, search, userId]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedRef.current || filterKeyRef.current !== filterKey) {
        void refresh();
      }
    }, [filterKey, refresh]),
  );
  return {
    peopleObservations,
    animatedObservationIds,
    refresh,
    loadMore,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
  };
}
