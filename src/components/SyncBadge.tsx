import { StyleSheet, Text, View } from 'react-native';
import { LocalSyncStatus } from '../types/record';
import { AppColors, fonts, useThemedStyles } from '../theme';

const labels: Record<LocalSyncStatus, string> = {
  pending_create: '待同步',
  pending_update: '待同步',
  pending_delete: '删除中',
  synced: '已同步',
};

export function SyncBadge({ status, compact = false }: { status: LocalSyncStatus; compact?: boolean }) {
  const styles = useThemedStyles(createStyles);
  const synced = status === 'synced';

  return (
    <View style={[styles.badge, compact && styles.compactBadge, synced ? styles.synced : styles.pending]}>
      <Text style={[styles.text, compact && styles.compactText, synced ? styles.syncedText : styles.pendingText]}>
        {labels[status]}
      </Text>
    </View>
  );
}

const createStyles = (colors: AppColors) => ({
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  compactBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  synced: { backgroundColor: colors.brandSoft },
  pending: { backgroundColor: colors.purpleSoft },
  text: { fontFamily: fonts.semibold, fontSize: 12 },
  compactText: { fontFamily: fonts.medium, fontSize: 11 },
  syncedText: { color: colors.brand },
  pendingText: { color: colors.purple },
});
