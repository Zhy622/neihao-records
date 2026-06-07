import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DilemmaRecord } from '../types/record';
import { colors } from '../theme';

export function RecordCard({ record, onDelete }: { record: DilemmaRecord; onDelete?: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{record.title}</Text>
        <Text style={styles.category}>{record.category}</Text>
      </View>
      <Text style={styles.meta}>
        情绪 {record.emotionIntensity}/10 · 决策 {record.decisionDifficulty}/10 · {record.timeCost}
      </Text>
      {record.thoughts ? <Text style={styles.thoughts} numberOfLines={2}>{record.thoughts}</Text> : null}
      <View style={styles.row}>
        <Text style={styles.date}>{new Date(record.createdAt).toLocaleString('zh-CN')}</Text>
        {onDelete ? (
          <Pressable onPress={onDelete} hitSlop={10}>
            <Text style={styles.delete}>删除</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 9,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '600' },
  category: { color: colors.primary, backgroundColor: colors.primarySoft, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  meta: { color: colors.muted, fontSize: 13 },
  thoughts: { color: colors.text, lineHeight: 20 },
  date: { color: colors.muted, fontSize: 12 },
  delete: { color: colors.danger, fontSize: 13 },
});
