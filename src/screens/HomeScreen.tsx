import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { HapticPressable } from '../components/HapticPressable';
import { RecordCard } from '../components/RecordCard';
import { Screen } from '../components/Screen';
import { SoftCard } from '../components/SoftCard';
import { StatCard } from '../components/StatCard';
import { useRecords } from '../hooks/useRecords';
import { RootStackParamList } from '../types/navigation';
import { average, getTodayRecords, mostCommon } from '../utils/stats';
import { colors, fonts } from '../theme';

export function HomeScreen({ navigation }: { navigation: NativeStackNavigationProp<RootStackParamList> }) {
  const { records } = useRecords();
  const todayRecords = getTodayRecords(records);
  const recentRecords = records.slice(0, 3);
  const pendingCount = records.filter((record) => record.syncStatus !== 'synced').length;
  const averageIntensity = average(todayRecords.map((record) => record.emotionIntensity));
  const commonCategory = mostCommon(todayRecords.map((record) => record.category));
  const hardestToday = todayRecords.length
    ? Math.max(...todayRecords.map((record) => record.emotionIntensity + record.decisionDifficulty))
    : 0;

  return (
    <Screen>
      <LinearGradient colors={['#FFFEFC', '#F1EEF9', '#EEF5EF']} style={styles.header}>
        <Text style={styles.eyebrow}>内耗记录本</Text>
        <Text style={styles.title}>今天，也留一点空间给自己。</Text>
        <Text style={styles.subtitle}>记录不是为了责怪，而是为了看清反复出现的模式。</Text>
      </LinearGradient>
      <View style={styles.grid}>
        <StatCard label="今天记录次数" value={todayRecords.length} />
        <StatCard label="今日平均情绪强度" value={averageIntensity ? averageIntensity.toFixed(1) : '—'} />
        <StatCard label="今日常见分类" value={commonCategory ?? '暂无'} />
        <StatCard label="今日最高耗心力" value={hardestToday ? `${hardestToday}/20` : '—'} />
      </View>
      {pendingCount ? (
        <SoftCard colors={['#FFFEFC', '#F3F0FA']} style={styles.pendingCard}>
          <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
          <Text style={styles.pending}>有 {pendingCount} 条记录待同步，联网后会自动重试。</Text>
        </SoftCard>
      ) : null}
      <HapticPressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={() => navigation.navigate('Record')}>
        <Ionicons name="add-circle-outline" size={21} color={colors.white} />
        <Text style={styles.buttonText}>记录一次纠结</Text>
      </HapticPressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 9, padding: 22, borderRadius: 28, borderWidth: 1, borderColor: colors.border },
  eyebrow: { color: colors.primary, fontFamily: fonts.bold, letterSpacing: 1 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 28, lineHeight: 38 },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  pendingCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  pending: { flex: 1, color: colors.primary, fontFamily: fonts.medium, fontSize: 13, lineHeight: 20 },
  button: { marginTop: 8, padding: 15, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: colors.primary },
  buttonText: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
  sectionTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 19, marginTop: 8 },
  list: { gap: 12 },
  pressed: { opacity: 0.85 },
});
