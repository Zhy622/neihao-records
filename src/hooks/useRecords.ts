import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { getRecords } from '../database/database';
import { syncRecords } from '../sync/records-sync';
import { DilemmaRecord, RecordFilters } from '../types/record';

const PAGE_SIZE = 10;

export function useRecords(filters: RecordFilters = {}) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const [records, setRecords] = useState<DilemmaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const hasLoadedRef = useRef(false);
  const loadedLimitRef = useRef(PAGE_SIZE);
  const remoteTotalRef = useRef<number | null>(null);
  const filterKeyRef = useRef('');
  const category = filters.category;
  const emotion = filters.emotion;
  const dateRange = filters.dateRange;
  const search = filters.search;
  const userId = session?.user.id;
  const filterKey = `${category ?? ''}|${emotion ?? ''}|${dateRange ?? ''}|${search ?? ''}`;

  const refresh = useCallback(async () => {
    if (!userId) {
      setRecords([]);
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
      setRecords([]);
    }

    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      try {
        const result = await syncRecords(db, userId, {
          filters: { category, emotion, dateRange, search },
          limit: PAGE_SIZE,
          offset: 0,
        });
        remoteTotalRef.current = result.remoteTotal ?? remoteTotalRef.current;
      } catch {
        // Local records remain available while a background sync attempt fails.
      }
      loadedLimitRef.current = PAGE_SIZE;
      const nextRecords = await getRecords(
        db,
        userId,
        { category, emotion, dateRange, search },
        { limit: loadedLimitRef.current },
      );
      setRecords(nextRecords);
      setHasMore(
        remoteTotalRef.current === null
          ? nextRecords.length >= loadedLimitRef.current
          : loadedLimitRef.current < remoteTotalRef.current,
      );
      hasLoadedRef.current = true;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [db, category, emotion, dateRange, filterKey, search, userId]);

  const loadMore = useCallback(async () => {
    if (!userId || isLoading || isRefreshing || isLoadingMore || !hasMore) {
      return;
    }

    const offset = loadedLimitRef.current;
    setIsLoadingMore(true);

    try {
      try {
        const result = await syncRecords(db, userId, {
          filters: { category, emotion, dateRange, search },
          limit: PAGE_SIZE,
          offset,
        });
        remoteTotalRef.current = result.remoteTotal ?? remoteTotalRef.current;
      } catch {
        // Local records remain available while a background sync attempt fails.
      }

      loadedLimitRef.current = offset + PAGE_SIZE;
      const nextRecords = await getRecords(
        db,
        userId,
        { category, emotion, dateRange, search },
        { limit: loadedLimitRef.current },
      );
      setRecords(nextRecords);
      setHasMore(
        remoteTotalRef.current === null
          ? nextRecords.length >= loadedLimitRef.current
          : loadedLimitRef.current < remoteTotalRef.current,
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    category,
    dateRange,
    db,
    emotion,
    hasMore,
    isLoading,
    isLoadingMore,
    isRefreshing,
    search,
    userId,
  ]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return { records, refresh, loadMore, isLoading, isRefreshing, isLoadingMore, hasMore };
}
