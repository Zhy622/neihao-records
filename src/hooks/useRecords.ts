import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { getRecords } from '../database/database';
import { DilemmaRecord, RecordFilters } from '../types/record';

export function useRecords(filters: RecordFilters = {}) {
  const db = useSQLiteContext();
  const [records, setRecords] = useState<DilemmaRecord[]>([]);
  const category = filters.category;
  const search = filters.search;

  const refresh = useCallback(async () => {
    setRecords(await getRecords(db, { category, search }));
  }, [db, category, search]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return { records, refresh };
}
