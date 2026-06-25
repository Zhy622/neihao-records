import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RecordCard } from '../components/RecordCard';
import { Screen } from '../components/Screen';
import { StatCard } from '../components/StatCard';
import { useRecords } from '../hooks/useRecords';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';
import { calculateStats } from '../utils/stats';

function InsightLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.insightLine}>
      <Text style={styles.insightLabel}>{label}</Text>
      <Text style={styles.insightValue}>{value}</Text>
    </View>
  );
}

export function StatsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { records } = useRecords();
  const stats = calculateStats(records);
  const unclearWorthRatio = stats.total ? Math.round((stats.unclearWorthCount / stats.total) * 100) : 0;
  const categoryPattern = stats.categoryCounts.length
    ? stats.categoryCounts.map((item) => `${item.label} ${item.count}次`).join(' · ')
    : '暂无';
  const emotionPattern = stats.emotionCounts.length
    ? stats.emotionCounts.map((item) => `${item.label} ${item.count}次`).join(' · ')
    : '暂无';

  return (
    <Screen>
      <View style={styles.header}><Text style={styles.title}>你的模式</Text><Text style={styles.subtitle}>数据会慢慢变成更省力的选择规则。</Text></View>
      <View style={styles.grid}>
        <StatCard label="总记录数" value={stats.total} />
        <StatCard label="最常见分类" value={stats.commonCategory ?? '暂无'} />
        <StatCard label="最常见情绪" value={stats.commonEmotion ?? '暂无'} />
        <StatCard label="平均情绪强度" value={stats.total ? stats.averageEmotionIntensity.toFixed(1) : '—'} />
        <StatCard label="平均决策难度" value={stats.total ? stats.averageDecisionDifficulty.toFixed(1) : '—'} />
      </View>
      <Text style={styles.sectionTitle}>高频模式</Text>
      <View style={styles.insights}>
        <InsightLine label="常见分类" value={categoryPattern} />
        <InsightLine label="常见感受" value={emotionPattern} />
        <InsightLine label="最耗心力分类" value={stats.mostDifficultCategory ? `${stats.mostDifficultCategory.category} · 平均 ${stats.mostDifficultCategory.average.toFixed(1)}/20` : '暂无'} />
        <InsightLine label="常见耗时" value={stats.commonTimeCost ?? '暂无'} />
        <InsightLine label="说不清占比" value={stats.total ? `${unclearWorthRatio}%` : '暂无'} />
      </View>
      <Text style={styles.sectionTitle}>最耗心力的记录</Text>
      <View style={styles.list}>
        {stats.hardestRecords.map((record) => (
          <RecordCard
            key={record.id}
            record={record}
            onOpen={() => navigation.navigate('RecordDetail', { id: record.id })}
          />
        ))}
        {!stats.hardestRecords.length ? <Text style={styles.empty}>记录几次后，这里会显示最耗心力的事情。</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 7, marginBottom: 4 },
  title: { color: colors.text, fontSize: 27, fontWeight: '700' },
  subtitle: { color: colors.muted, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '700', marginTop: 8 },
  insights: { gap: 8 },
  insightLine: { gap: 6, padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  insightLabel: { color: colors.muted, fontSize: 13 },
  insightValue: { color: colors.text, fontSize: 15, fontWeight: '600', lineHeight: 22 },
  list: { gap: 12 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 30 },
});
