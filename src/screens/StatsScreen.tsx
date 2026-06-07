import { StyleSheet, Text, View } from 'react-native';
import { RecordCard } from '../components/RecordCard';
import { Screen } from '../components/Screen';
import { StatCard } from '../components/StatCard';
import { useRecords } from '../hooks/useRecords';
import { colors } from '../theme';
import { calculateStats } from '../utils/stats';

export function StatsScreen() {
  const { records } = useRecords();
  const stats = calculateStats(records);

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
      <Text style={styles.sectionTitle}>最耗心力的记录</Text>
      <View style={styles.list}>
        {stats.hardestRecords.map((record) => <RecordCard key={record.id} record={record} />)}
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
  list: { gap: 12 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 30 },
});
