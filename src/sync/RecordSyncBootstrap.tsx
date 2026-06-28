import { useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { syncRecords } from './records-sync';

export function RecordSyncBootstrap() {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (userId) {
      void syncRecords(db, userId).catch(() => undefined);
    }
  }, [db, userId]);

  return null;
}
