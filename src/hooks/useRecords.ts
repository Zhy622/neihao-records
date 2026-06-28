import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { getRecords } from '../database/database';
import { syncRecords } from '../sync/records-sync';
import { DilemmaRecord, RecordFilters } from '../types/record';

export function useRecords(filters: RecordFilters = {}) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const [records, setRecords] = useState<DilemmaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const category = filters.category;
  const emotion = filters.emotion;
  const dateRange = filters.dateRange;
  const search = filters.search;
  const userId = session?.user.id;

  const refresh = useCallback(async () => {
    if (!userId) {
      setRecords([]);
      hasLoadedRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      try {
        await syncRecords(db, userId);
      } catch {
        // Local records remain available while a background sync attempt fails.
      }
      setRecords(await getRecords(db, userId, { category, emotion, dateRange, search }));
      hasLoadedRef.current = true;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [db, category, emotion, dateRange, search, userId]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return { records, refresh, isLoading, isRefreshing };
}
