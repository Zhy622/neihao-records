import { useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { syncPeopleObservations } from './people-observations-sync';
import { syncRecords } from './records-sync';

export function RecordSyncBootstrap() {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (userId) {
      void syncRecords(db, userId).catch(() => undefined);
      void syncPeopleObservations(db, userId).catch(() => undefined);
    }
  }, [db, userId]);

  return null;
}
