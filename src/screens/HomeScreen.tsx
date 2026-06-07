import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { StatCard } from '../components/StatCard';
import { useRecords } from '../hooks/useRecords';
import { RootStackParamList } from '../types/navigation';
import { average, getTodayRecords, mostCommon } from '../utils/stats';
import { colors } from '../theme';

export function HomeScreen({ navigation }: { navigation: NativeStackNavigationProp<RootStackParamList> }) {
  const { records } = useRecords();
  const todayRecords = getTodayRecords(records);
  const averageIntensity = average(todayRecords.map((record) => record.emotionIntensity));
  const commonCategory = mostCommon(todayRecords.map((record) => record.category));

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>内耗记录本</Text>
        <Text style={styles.title}>今天，也留一点空间给自己。</Text>
        <Text style={styles.subtitle}>记录不是为了责怪，而是为了看清反复出现的模式。</Text>
      </View>
      <View style={styles.grid}>
        <StatCard label="今天记录次数" value={todayRecords.length} />
        <StatCard label="今日平均情绪强度" value={averageIntensity ? averageIntensity.toFixed(1) : '—'} />
        <StatCard label="今日常见分类" value={commonCategory ?? '暂无'} />
      </View>
      <Pressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={() => navigation.navigate('Record')}>
        <Text style={styles.buttonText}>记录一次纠结</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 9, paddingVertical: 14 },
  eyebrow: { color: colors.primary, fontWeight: '700', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', lineHeight: 38 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  button: { marginTop: 10, padding: 17, borderRadius: 16, alignItems: 'center', backgroundColor: colors.primary },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.85 },
});
