import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { getPeopleObservations } from '../database/database';
import { syncPeopleObservations } from '../sync/people-observations-sync';
import {
  PeopleObservation,
  PeopleObservationFilters,
} from '../types/people-observation';

export function usePeopleObservations(filters: PeopleObservationFilters = {}) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const [peopleObservations, setPeopleObservations] = useState<PeopleObservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const search = filters.search;
  const userId = session?.user.id;

  const refresh = useCallback(async () => {
    if (!userId) {
      setPeopleObservations([]);
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
        await syncPeopleObservations(db, userId);
      } catch {
        // Local observations remain available while a background sync attempt fails.
      }
      setPeopleObservations(await getPeopleObservations(db, userId, { search }));
      hasLoadedRef.current = true;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [db, search, userId]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  return { peopleObservations, refresh, isLoading, isRefreshing };
}
