import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable } from './HapticPressable';
import { DilemmaRecord } from '../types/record';
import { AppColors, fonts, useAppTheme, useThemedStyles } from '../theme';

export function RecordCard({
  record,
  onDelete,
  onOpen,
}: {
  record: DilemmaRecord;
  onDelete?: () => void;
  onOpen?: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const synced = record.syncStatus === 'synced';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleGroup}>
          <View style={styles.cardIcon}>
            <Ionicons name="document-text-outline" size={20} color={colors.brand} />
          </View>
          <Text numberOfLines={1} style={styles.cardTitle}>{record.title}</Text>
        </View>
        <Text style={styles.category}>{record.category}</Text>
      </View>

      <View style={styles.metrics}>
        <Text style={styles.metricLabel}>情绪</Text>
        <Text style={styles.metricValue}>{record.emotionIntensity}/10</Text>
        <Text style={styles.metricLabel}>决策</Text>
        <Text style={styles.metricValue}>{record.decisionDifficulty}/10</Text>
        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.metricLabel}>{record.timeCost}</Text>
      </View>

      <View style={styles.thoughtsWrap}>
        <Text numberOfLines={2} style={styles.thoughts}>{record.thoughts || '未填写当时反复出现的想法。'}</Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.recordStatus}>
          <Text style={styles.date}>{new Date(record.createdAt).toLocaleString('zh-CN')}</Text>
          <View style={[styles.syncBadge, !synced && styles.pendingBadge]}>
            <Ionicons name={synced ? 'sync-outline' : 'cloud-offline-outline'} size={10} color={synced ? colors.brand : colors.purple} />
            <Text style={[styles.syncText, !synced && styles.pendingText]}>{synced ? '已同步' : '待同步'}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          {onOpen ? (
            <HapticPressable accessibilityRole="button" accessibilityLabel="查看记录详情" feedback="selection" hitSlop={10} style={styles.cardAction} onPress={onOpen}>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </HapticPressable>
          ) : null}
          {onDelete ? (
            <HapticPressable accessibilityRole="button" accessibilityLabel="删除记录" hitSlop={10} style={styles.cardAction} onPress={onDelete}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </HapticPressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: AppColors) => ({
  card: {
    minHeight: 232,
    gap: 12,
    paddingHorizontal: 21,
    paddingVertical: 18,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: colors.card,
    boxShadow: `0 10px 40px -10px ${colors.shadow}`,
  },
  cardHeader: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderCurve: 'continuous', backgroundColor: colors.cardSecondary },
  cardTitle: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 18, lineHeight: 23 },
  category: { borderRadius: 999, backgroundColor: colors.warmSoft, color: colors.warm, fontFamily: fonts.medium, fontSize: 11, letterSpacing: 0.55, lineHeight: 17, paddingHorizontal: 12, paddingVertical: 4 },
  metrics: { height: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricLabel: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, opacity: 0.8 },
  metricValue: { color: colors.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginRight: 12 },
  thoughtsWrap: { height: 48, paddingTop: 3, paddingBottom: 3 },
  thoughts: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  cardFooter: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 12 },
  recordStatus: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  date: { color: colors.placeholder, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17 },
  syncBadge: { height: 21, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, backgroundColor: colors.brandSoft, paddingHorizontal: 8 },
  pendingBadge: { backgroundColor: colors.purpleSoft },
  syncText: { color: colors.brand, fontFamily: fonts.regular, fontSize: 11, lineHeight: 17 },
  pendingText: { color: colors.purple },
  cardActions: { flexDirection: 'row', gap: 4 },
  cardAction: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
});
