import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import { RecordCard } from '../components/RecordCard';
import { Screen } from '../components/Screen';
import { SoftCard } from '../components/SoftCard';
import { StatCard } from '../components/StatCard';
import { useRecords } from '../hooks/useRecords';
import { RootStackParamList } from '../types/navigation';
import { colors, fonts } from '../theme';
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
  const { records } = useRecords({}, { pageSize: 200 });
  const stats = calculateStats(records);
  const unclearWorthRatio = stats.total ? Math.round((stats.unclearWorthCount / stats.total) * 100) : 0;
  const categoryPattern = stats.categoryCounts.length
    ? stats.categoryCounts.map((item) => `${item.label} ${item.count}次`).join(' · ')
    : '暂无';
  const emotionPattern = stats.emotionCounts.length
    ? stats.emotionCounts.map((item) => `${item.label} ${item.count}次`).join(' · ')
    : '暂无';
  const trendData = buildTrendData(records);
  const pieData = stats.categoryCounts.map((item, index) => ({
    value: item.count,
    text: item.label,
    color: ['#D9D2EA', '#DCE7EF', '#DDEBDD'][index] ?? '#E8E1F4',
  }));

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
      <Text style={styles.sectionTitle}>最近趋势</Text>
      <SoftCard colors={['#FFFEFC', '#F3F0FA']} style={styles.chartCard}>
        {trendData.some((item) => item.value > 0) ? (
          <LineChart
            data={trendData}
            height={150}
            spacing={36}
            thickness={2}
            color={colors.primary}
            dataPointsColor="#B6A7D5"
            areaChart
            startFillColor="#D9D2EA"
            endFillColor="#FFFEFC"
            startOpacity={0.32}
            endOpacity={0.02}
            hideRules
            hideYAxisText
            yAxisColor="transparent"
            xAxisColor="#E3E1DA"
            xAxisLabelTextStyle={styles.chartLabel}
            initialSpacing={6}
          />
        ) : (
          <Text style={styles.chartEmpty}>记录几天后，这里会显示内耗强度变化。</Text>
        )}
      </SoftCard>
      <Text style={styles.sectionTitle}>纠结类型分布</Text>
      <SoftCard colors={['#FFFEFC', '#EEF5EF']} style={styles.pieCard}>
        {pieData.length ? (
          <>
            <PieChart data={pieData} donut radius={72} innerRadius={48} showText={false} />
            <View style={styles.legend}>
              {pieData.map((item) => (
                <View key={item.text} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.text} · {item.value}次</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={styles.chartEmpty}>记录多一点后，这里会看到最常出现的纠结类型。</Text>
        )}
      </SoftCard>
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

function buildTrendData(records: ReturnType<typeof useRecords>['records']) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - index));
    const key = day.toDateString();
    const dayRecords = records.filter((record) => new Date(record.createdAt).toDateString() === key);
    const value = dayRecords.length
      ? Math.round(dayRecords.reduce((sum, record) => sum + record.emotionIntensity + record.decisionDifficulty, 0) / dayRecords.length)
      : 0;

    return {
      value,
      label: `${day.getMonth() + 1}/${day.getDate()}`,
    };
  });
}

const styles = StyleSheet.create({
  header: { gap: 7, marginBottom: 4 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 27 },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 21 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sectionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 19, marginTop: 8 },
  insights: { gap: 8 },
  insightLine: { gap: 6, padding: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  insightLabel: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13 },
  insightValue: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  chartCard: { paddingVertical: 18, overflow: 'hidden' },
  pieCard: { alignItems: 'center', flexDirection: 'row', gap: 18 },
  chartLabel: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10 },
  chartEmpty: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 21, textAlign: 'center' },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  list: { gap: 12 },
  empty: { color: colors.muted, fontFamily: fonts.regular, textAlign: 'center', paddingVertical: 30 },
});
