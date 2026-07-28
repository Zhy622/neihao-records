import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { RecordCard } from '../components/RecordCard';
import { Screen } from '../components/Screen';
import { useRecords } from '../hooks/useRecords';
import { RootStackParamList } from '../types/navigation';
import { fonts } from '../theme';
import { calculateStats } from '../utils/stats';

const chartColors = ['#739476', '#A8C6AA', '#D7BA7D'];

function SummaryMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.summaryMetric}>
      <Text style={styles.summaryValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.summaryLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function InsightRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.insightRow}>
      <Text style={styles.insightLabel}>{label}</Text>
      <Text style={styles.insightValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function SectionHeading({ icon, title, subtitle }: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionIcon}><Ionicons name={icon} size={15} color="#466349" /></View>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function StatsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const { records } = useRecords({}, { pageSize: 200 });
  const stats = calculateStats(records);
  const isNarrow = width < 360;
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
    color: chartColors[index] ?? '#C6D6C7',
  }));

  return (
    <Screen backgroundColor="#F7FAF8" contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>回看与觉察</Text>
        <Text style={styles.title}>你的记录模式</Text>
        <Text style={styles.subtitle}>让重复出现的情绪和选择，慢慢变得清晰。</Text>
      </View>

      <View style={styles.overviewCard}>
        <View style={styles.overviewTop}>
          <View style={styles.overviewIcon}><Ionicons name="analytics-outline" size={19} color="#466349" /></View>
          <Text style={styles.overviewLabel}>累计记录</Text>
        </View>
        <View style={styles.overviewNumberRow}>
          <Text style={styles.overviewNumber}>{stats.total}</Text>
          <Text style={styles.overviewUnit}>次</Text>
        </View>
        <Text style={styles.overviewHint}>{stats.total ? '每一次停下来，都是在更了解自己。' : '从第一条记录开始，观察自己的模式。'}</Text>
        <View style={styles.summaryGrid}>
          <SummaryMetric label="常见分类" value={stats.commonCategory ?? '暂无'} />
          <View style={styles.summaryDivider} />
          <SummaryMetric label="常见感受" value={stats.commonEmotion ?? '暂无'} />
          <View style={styles.summaryDivider} />
          <SummaryMetric label="说不清占比" value={stats.total ? `${unclearWorthRatio}%` : '暂无'} />
        </View>
      </View>

      <View style={styles.intensityCard}>
        <View style={styles.intensityItem}>
          <Text style={styles.intensityLabel}>平均情绪强度</Text>
          <Text style={styles.intensityValue}>{stats.total ? stats.averageEmotionIntensity.toFixed(1) : '—'}<Text style={styles.intensityUnit}> / 10</Text></Text>
        </View>
        <View style={styles.intensityDivider} />
        <View style={styles.intensityItem}>
          <Text style={styles.intensityLabel}>平均决策难度</Text>
          <Text style={styles.intensityValue}>{stats.total ? stats.averageDecisionDifficulty.toFixed(1) : '—'}<Text style={styles.intensityUnit}> / 10</Text></Text>
        </View>
      </View>

      <View style={styles.insightsCard}>
        <SectionHeading icon="sparkles-outline" title="高频模式" subtitle="从重复中找到线索" />
        <InsightRow label="常见分类" value={categoryPattern} />
        <InsightRow label="常见感受" value={emotionPattern} />
        <InsightRow
          label="最耗心力分类"
          value={stats.mostDifficultCategory ? `${stats.mostDifficultCategory.category} · 平均 ${stats.mostDifficultCategory.average.toFixed(1)} / 20` : '暂无'}
        />
        <InsightRow label="常见耗时" value={stats.commonTimeCost ?? '暂无'} />
      </View>

      <View style={styles.chartCard}>
        <SectionHeading icon="trending-up-outline" title="最近趋势" subtitle="近 7 天的内耗强度" />
        {trendData.some((item) => item.value > 0) ? (
          <View style={styles.lineChartWrap}>
            <LineChart
              data={trendData}
              height={145}
              spacing={isNarrow ? 33 : 40}
              thickness={2.5}
              color="#638569"
              dataPointsColor="#638569"
              areaChart
              startFillColor="#CFE0D0"
              endFillColor="#FFFFFF"
              startOpacity={0.4}
              endOpacity={0.04}
              hideRules
              hideYAxisText
              yAxisColor="transparent"
              xAxisColor="#E7ECE7"
              xAxisLabelTextStyle={styles.chartLabel}
              initialSpacing={6}
            />
          </View>
        ) : (
          <Text style={styles.chartEmpty}>记录几天后，这里会显示内耗强度的变化。</Text>
        )}
      </View>

      <View style={styles.chartCard}>
        <SectionHeading icon="pie-chart-outline" title="纠结类型分布" subtitle="出现频率最高的三类" />
        {pieData.length ? (
          <View style={[styles.distributionBody, isNarrow && styles.distributionBodyNarrow]}>
            <PieChart data={pieData} donut radius={70} innerRadius={48} showText={false} />
            <View style={styles.legend}>
              {pieData.map((item) => (
                <View key={item.text} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText} numberOfLines={1}>{item.text}</Text>
                  <Text style={styles.legendCount}>{item.value} 次</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text style={styles.chartEmpty}>记录多一点后，这里会看到最常出现的纠结类型。</Text>
        )}
      </View>

      <View style={styles.recordsSection}>
        <SectionHeading icon="flame-outline" title="最耗心力的记录" subtitle="情绪与决策难度最高的三条" />
        <View style={styles.list}>
          {stats.hardestRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              onOpen={() => navigation.navigate('RecordDetail', { id: record.id })}
            />
          ))}
          {!stats.hardestRecords.length ? <Text style={styles.recordsEmpty}>记录几次后，这里会显示最耗心力的事情。</Text> : null}
        </View>
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

    return { value, label: `${day.getMonth() + 1}/${day.getDate()}` };
  });
}

const styles = StyleSheet.create({
  content: { gap: 18, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 128 },
  header: { gap: 5, paddingTop: 4, paddingBottom: 3 },
  eyebrow: { color: '#638569', fontFamily: fonts.medium, fontSize: 12, letterSpacing: 0.6 },
  title: { color: '#252C26', fontFamily: fonts.medium, fontSize: 25, letterSpacing: -0.7, lineHeight: 33 },
  subtitle: { color: '#6B746C', fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  overviewCard: { backgroundColor: '#FFFFFF', borderRadius: 28, gap: 9, padding: 21 },
  overviewTop: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  overviewIcon: { alignItems: 'center', backgroundColor: '#E8F0E8', borderRadius: 15, height: 30, justifyContent: 'center', width: 30 },
  overviewLabel: { color: '#59705D', fontFamily: fonts.medium, fontSize: 13 },
  overviewNumberRow: { alignItems: 'baseline', flexDirection: 'row', gap: 5, marginTop: 3 },
  overviewNumber: { color: '#304832', fontFamily: fonts.semibold, fontSize: 37, fontVariant: ['tabular-nums'], letterSpacing: -1.2, lineHeight: 44 },
  overviewUnit: { color: '#59705D', fontFamily: fonts.regular, fontSize: 14 },
  overviewHint: { color: '#788078', fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  summaryGrid: { alignItems: 'stretch', flexDirection: 'row', marginTop: 9 },
  summaryMetric: { flex: 1, gap: 5 },
  summaryValue: { color: '#303832', fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
  summaryLabel: { color: '#89918A', fontFamily: fonts.regular, fontSize: 11 },
  summaryDivider: { backgroundColor: '#EDF0ED', marginHorizontal: 8, width: StyleSheet.hairlineWidth },
  intensityCard: { backgroundColor: '#EDF4ED', borderRadius: 22, flexDirection: 'row', paddingVertical: 16 },
  intensityItem: { flex: 1, gap: 5, paddingHorizontal: 18 },
  intensityLabel: { color: '#68756A', fontFamily: fonts.regular, fontSize: 12 },
  intensityValue: { color: '#3D5940', fontFamily: fonts.semibold, fontSize: 20, fontVariant: ['tabular-nums'] },
  intensityUnit: { color: '#748176', fontFamily: fonts.regular, fontSize: 11 },
  intensityDivider: { backgroundColor: '#DDE8DD', width: StyleSheet.hairlineWidth },
  insightsCard: { backgroundColor: '#FFFFFF', borderRadius: 28, overflow: 'hidden', paddingTop: 18 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: 18 },
  sectionIcon: { alignItems: 'center', backgroundColor: '#ECF2EC', borderRadius: 12, height: 24, justifyContent: 'center', width: 24 },
  sectionCopy: { flex: 1, gap: 1 },
  sectionTitle: { color: '#354035', fontFamily: fonts.medium, fontSize: 16 },
  sectionSubtitle: { color: '#909790', fontFamily: fonts.regular, fontSize: 11 },
  insightRow: { borderBottomColor: '#EEF1EE', borderBottomWidth: StyleSheet.hairlineWidth, gap: 4, marginLeft: 51, paddingBottom: 12, paddingRight: 18, paddingTop: 12 },
  insightLabel: { color: '#89918A', fontFamily: fonts.regular, fontSize: 12 },
  insightValue: { color: '#3D463E', fontFamily: fonts.medium, fontSize: 13, lineHeight: 20 },
  chartCard: { backgroundColor: '#FFFFFF', borderRadius: 28, gap: 17, paddingBottom: 18, paddingTop: 18 },
  lineChartWrap: { marginLeft: 13, overflow: 'hidden' },
  chartLabel: { color: '#939A94', fontFamily: fonts.regular, fontSize: 9 },
  chartEmpty: { color: '#89918A', fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, paddingHorizontal: 24, paddingVertical: 35, textAlign: 'center' },
  distributionBody: { alignItems: 'center', flexDirection: 'row', gap: 20, paddingHorizontal: 24 },
  distributionBodyNarrow: { gap: 13, paddingHorizontal: 18 },
  legend: { flex: 1, gap: 11 },
  legendRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  legendDot: { borderRadius: 5, height: 10, width: 10 },
  legendText: { color: '#4C554D', flex: 1, fontFamily: fonts.regular, fontSize: 12 },
  legendCount: { color: '#6E786F', fontFamily: fonts.medium, fontSize: 12 },
  recordsSection: { gap: 14 },
  list: { gap: 10 },
  recordsEmpty: { color: '#89918A', fontFamily: fonts.regular, fontSize: 13, lineHeight: 21, paddingHorizontal: 24, paddingVertical: 26, textAlign: 'center' },
});
