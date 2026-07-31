import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable } from './HapticPressable';
import { DilemmaRecord } from '../types/record';
import { fonts } from '../theme';

export function RecordCard({
  record,
  onDelete,
  onOpen,
}: {
  record: DilemmaRecord;
  onDelete?: () => void;
  onOpen?: () => void;
}) {
  const synced = record.syncStatus === 'synced';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleGroup}>
          <View style={styles.cardIcon}>
            <Ionicons name="document-text-outline" size={20} color="#466349" />
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
        <Ionicons name="time-outline" size={14} color="#424841" />
        <Text style={styles.metricLabel}>{record.timeCost}</Text>
      </View>

      <View style={styles.thoughtsWrap}>
        <Text numberOfLines={2} style={styles.thoughts}>{record.thoughts || '未填写当时反复出现的想法。'}</Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.recordStatus}>
          <Text style={styles.date}>{new Date(record.createdAt).toLocaleString('zh-CN')}</Text>
          <View style={[styles.syncBadge, !synced && styles.pendingBadge]}>
            <Ionicons name={synced ? 'sync-outline' : 'cloud-offline-outline'} size={10} color={synced ? '#466349' : '#665B7C'} />
            <Text style={[styles.syncText, !synced && styles.pendingText]}>{synced ? '已同步' : '待同步'}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          {onOpen ? (
            <HapticPressable accessibilityRole="button" accessibilityLabel="查看记录详情" feedback="selection" hitSlop={10} style={styles.cardAction} onPress={onOpen}>
              <Ionicons name="chevron-forward" size={18} color="#424841" />
            </HapticPressable>
          ) : null}
          {onDelete ? (
            <HapticPressable accessibilityRole="button" accessibilityLabel="删除记录" hitSlop={10} style={styles.cardAction} onPress={onDelete}>
              <Ionicons name="trash-outline" size={18} color="#F05B5B" />
            </HapticPressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 232,
    gap: 12,
    paddingHorizontal: 21,
    paddingVertical: 18,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 10px 40px -10px rgba(70, 99, 73, 0.08)',
  },
  cardHeader: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderCurve: 'continuous', backgroundColor: '#F7F7F2' },
  cardTitle: { flex: 1, color: '#181C1C', fontFamily: fonts.medium, fontSize: 18, lineHeight: 23 },
  category: { borderRadius: 999, backgroundColor: '#FFF3E8', color: '#7A532A', fontFamily: fonts.medium, fontSize: 11, letterSpacing: 0.55, lineHeight: 17, paddingHorizontal: 12, paddingVertical: 4 },
  metrics: { height: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricLabel: { color: '#424841', fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, opacity: 0.6 },
  metricValue: { color: '#181C1C', fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginRight: 12 },
  thoughtsWrap: { height: 48, paddingTop: 3, paddingBottom: 3 },
  thoughts: { color: '#424841', fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, opacity: 0.9 },
  cardFooter: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: 'rgba(194, 200, 191, 0.08)', paddingTop: 12 },
  recordStatus: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  date: { color: '#737971', fontFamily: fonts.medium, fontSize: 11, lineHeight: 17 },
  syncBadge: { height: 21, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, backgroundColor: 'rgba(202, 235, 201, 0.2)', paddingHorizontal: 8 },
  pendingBadge: { backgroundColor: '#F3F0FA' },
  syncText: { color: '#466349', fontFamily: fonts.medium, fontSize: 11, lineHeight: 17 },
  pendingText: { color: '#7c765b' },
  cardActions: { flexDirection: 'row', gap: 4 },
  cardAction: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
});
