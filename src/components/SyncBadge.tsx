import { StyleSheet, Text, View } from 'react-native';
import { LocalSyncStatus } from '../types/record';
import { colors, fonts } from '../theme';

const labels: Record<LocalSyncStatus, string> = {
  pending_create: '待同步',
  pending_update: '待同步',
  pending_delete: '删除中',
  synced: '已同步',
};

export function SyncBadge({ status }: { status: LocalSyncStatus }) {
  const synced = status === 'synced';

  return (
    <View style={[styles.badge, synced ? styles.synced : styles.pending]}>
      <Text style={[styles.text, synced ? styles.syncedText : styles.pendingText]}>
        {labels[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  synced: { backgroundColor: '#E5ECE6' },
  pending: { backgroundColor: '#F3F0FA' },
  text: { fontFamily: fonts.semibold, fontSize: 12 },
  syncedText: { color: colors.primary },
  pendingText: { color: '#776C91' },
});
