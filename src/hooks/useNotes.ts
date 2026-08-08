import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { getNotes } from '../database/database';
import { syncNotes } from '../sync/notes-sync';
import { Note, NoteFilters } from '../types/note';

const PAGE_SIZE = 10;

export function useNotes(filters: NoteFilters = {}) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const hasLoadedRef = useRef(false);
  const loadedLimitRef = useRef(PAGE_SIZE);
  const remoteTotalRef = useRef<number | null>(null);
  const filterKeyRef = useRef('');
  const category = filters.category;
  const userId = session?.user.id;
  const filterKey = category ?? '';

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotes([]);
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
      setNotes([]);
    }

    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const refreshLimit = isInitialLoad ? PAGE_SIZE : loadedLimitRef.current;
      try {
        const result = await syncNotes(db, userId, {
          filters: { category },
          limit: refreshLimit,
          offset: 0,
        });
        remoteTotalRef.current = result.remoteTotal ?? remoteTotalRef.current;
      } catch {
        // Local notes remain available while a background sync attempt fails.
      }

      const nextNotes = await getNotes(
        db,
        userId,
        { category },
        { limit: refreshLimit },
      );
      loadedLimitRef.current = refreshLimit;
      setNotes(nextNotes);
      setHasMore(
        remoteTotalRef.current === null
          ? nextNotes.length >= loadedLimitRef.current
          : loadedLimitRef.current < remoteTotalRef.current,
      );
      hasLoadedRef.current = true;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [category, db, filterKey, userId]);

  const loadMore = useCallback(async () => {
    if (!userId || isLoading || isRefreshing || isLoadingMore || !hasMore) return;

    const offset = loadedLimitRef.current;
    setIsLoadingMore(true);
    try {
      try {
        const result = await syncNotes(db, userId, {
          filters: { category },
          limit: PAGE_SIZE,
          offset,
        });
        remoteTotalRef.current = result.remoteTotal ?? remoteTotalRef.current;
      } catch {
        // Local notes remain available while a background sync attempt fails.
      }

      loadedLimitRef.current = offset + PAGE_SIZE;
      const nextNotes = await getNotes(
        db,
        userId,
        { category },
        { limit: loadedLimitRef.current },
      );
      setNotes(nextNotes);
      setHasMore(
        remoteTotalRef.current === null
          ? nextNotes.length >= loadedLimitRef.current
          : loadedLimitRef.current < remoteTotalRef.current,
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [category, db, hasMore, isLoading, isLoadingMore, isRefreshing, userId]);

  useFocusEffect(
    useCallback(() => {
      if (!hasLoadedRef.current || filterKeyRef.current !== filterKey) {
        void refresh();
      }
    }, [filterKey, refresh]),
  );

  return { notes, refresh, loadMore, isLoading, isRefreshing, isLoadingMore, hasMore };
}
