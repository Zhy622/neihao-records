import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StyleSheet, Text, View } from 'react-native';
import { HapticPressable } from './HapticPressable';
import { SyncBadge } from './SyncBadge';
import { DilemmaRecord } from '../types/record';
import { colors, fonts } from '../theme';

export function RecordCard({
  record,
  onDelete,
  onOpen,
}: {
  record: DilemmaRecord;
  onDelete?: () => void;
  onOpen?: () => void;
}) {
  return (
    <Animated.View entering={FadeInUp.duration(260).springify().damping(18)} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          </View>
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.title}>{record.title}</Text>
        </View>
        <Text style={styles.category}>{record.category}</Text>
      </View>
      <Text style={styles.meta}>
        情绪 {record.emotionIntensity}/10 · 决策 {record.decisionDifficulty}/10 · {record.timeCost}
      </Text>
      {record.thoughts ? <Text style={styles.thoughts} numberOfLines={2}>{record.thoughts}</Text> : null}
      <View style={styles.row}>
        <Text style={styles.date}>{new Date(record.createdAt).toLocaleString('zh-CN')}</Text>
        <View style={styles.actions}>
          <SyncBadge status={record.syncStatus} />
          {onOpen ? (
            <HapticPressable feedback="selection" onPress={onOpen} hitSlop={10} style={styles.iconButton}>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </HapticPressable>
          ) : null}
          {onDelete ? (
            <HapticPressable feedback="light" onPress={onDelete} hitSlop={10} style={styles.iconButton}>
              <Ionicons name="trash-outline" size={17} color={colors.danger} />
            </HapticPressable>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 9,
    padding: 16,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 6px 18px rgba(79, 88, 82, 0.06)',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primarySoft },
  title: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 17 },
  category: { color: '#665B7C', backgroundColor: '#F3F0FA', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, fontFamily: fonts.semibold, fontSize: 12 },
  meta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13 },
  thoughts: { color: colors.text, fontFamily: fonts.regular, lineHeight: 20 },
  date: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 15, backgroundColor: '#F7F5F1' },
});
