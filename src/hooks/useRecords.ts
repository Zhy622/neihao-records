import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { getRecords } from '../database/database';
import { syncPendingRecords } from '../sync/records-sync';
import { DilemmaRecord, RecordFilters } from '../types/record';

export function useRecords(filters: RecordFilters = {}) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const [records, setRecords] = useState<DilemmaRecord[]>([]);
  const category = filters.category;
  const emotion = filters.emotion;
  const dateRange = filters.dateRange;
  const search = filters.search;
  const userId = session?.user.id;

  const refresh = useCallback(async () => {
    if (!userId) {
      setRecords([]);
      return;
    }

    try {
      await syncPendingRecords(db, userId);
    } catch {
      // Local records remain available while a background sync attempt fails.
    }
    setRecords(await getRecords(db, userId, { category, emotion, dateRange, search }));
  }, [db, category, emotion, dateRange, search, userId]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return { records, refresh };
}
