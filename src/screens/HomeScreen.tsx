import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, StyleSheet, Text, View } from 'react-native';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { SoftCard } from '../components/SoftCard';
import { StatCard } from '../components/StatCard';
import { useRecords } from '../hooks/useRecords';
import { RootStackParamList } from '../types/navigation';
import { average, getTodayRecords, mostCommon } from '../utils/stats';
import { colors, fonts } from '../theme';

const backgroundColor = '#F7FAF8';

export function HomeScreen({ navigation }: { navigation: NativeStackNavigationProp<RootStackParamList> }) {
  const { records } = useRecords({}, { pageSize: 200 });
  const todayRecords = getTodayRecords(records);
  const pendingCount = records.filter((record) => record.syncStatus !== 'synced').length;
  const averageIntensity = average(todayRecords.map((record) => record.emotionIntensity));
  const commonCategory = mostCommon(todayRecords.map((record) => record.category));
  const hardestToday = todayRecords.length
    ? Math.max(...todayRecords.map((record) => record.emotionIntensity + record.decisionDifficulty))
    : 0;

  return (
    <Screen backgroundColor={backgroundColor} contentStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroCopy}>
          <View style={styles.heroHeading}>
            <Text style={styles.eyebrow}>Emotional Journal</Text>
            <Text style={styles.title}>{'今天，也留一点空间\n给自己。'}</Text>
          </View>
          <Text style={styles.subtitle}>记录不是为了责怪，而是为了看清反复出现的模式。</Text>
        </View>
        <Image
          accessibilityIgnoresInvertColors
          source={require('../../assets/home-hero-leaves.png')}
          style={styles.heroLeaves}
        />
      </View>
      <View style={styles.grid}>
        <StatCard
          icon="calendar-outline"
          label="今日记录次数"
          value={todayRecords.length}
        />
        <StatCard
          icon="happy-outline"
          iconBackgroundColor="rgba(255, 220, 189, 0.3)"
          iconColor="#7A532A"
          label="今日平均情绪"
          value={averageIntensity ? averageIntensity.toFixed(1) : '-'}
        />
        <StatCard
          compact
          icon="shapes-outline"
          iconBackgroundColor="rgba(227, 228, 211, 0.3)"
          iconColor="#666858"
          label="今日常见分类"
          value={commonCategory ?? '暂无'}
        />
        <StatCard
          icon="flash-outline"
          iconBackgroundColor="rgba(255, 218, 214, 0.3)"
          iconColor="#C10E1A"
          label="最高耗心力"
          value={hardestToday ? `${hardestToday}/20` : '-'}
        />
      </View>
      {pendingCount ? (
        <SoftCard colors={['#FFFFFF', '#F4F8F4']} style={styles.pendingCard}>
          <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
          <Text style={styles.pending}>有 {pendingCount} 条记录待同步，联网后会自动重试。</Text>
        </SoftCard>
      ) : null}
      <HapticPressable
        accessibilityRole="button"
        accessibilityLabel="记录一次纠结"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Record')}
      >
        <Ionicons name="add" size={20} color={colors.white} />
        <Text style={styles.buttonText}>记录一次纠结</Text>
      </HapticPressable>
      <SoftCard colors={['#FFF3E8', '#FFF3E8']} style={styles.tipCard}>
        <Ionicons name="bulb-outline" size={20} color="#7A532A" />
        <View style={styles.tipCopy}>
          <Text style={styles.tipTitle}>小贴士</Text>
          <Text style={styles.tipText}>
            在每一个情绪涌现的瞬间，深呼吸三次。这里的每一条记录，都是你向内探索的足迹。
          </Text>
        </View>
      </SoftCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 32, gap: 32 },
  hero: {
    minHeight: 200,
    padding: 24,
    overflow: 'hidden',
    borderRadius: 32,
    borderCurve: 'continuous',
    // borderWidth: 1,
    // borderColor: 'rgba(194, 200, 191, 0.3)',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 10px 40px -10px rgba(70, 99, 73, 0.08)',
  },
  heroGlow: {
    position: 'absolute',
    top: -64,
    right: -64,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: 'rgba(202, 235, 201, 0.1)',
  },
  heroCopy: { gap: 24 },
  heroHeading: { gap: 7 },
  eyebrow: {
    color: '#466349',
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 20,
    letterSpacing: 1.4,
  },
  title: {
    color: '#181C1C',
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 32.5,
    letterSpacing: -0.52,
  },
  subtitle: {
    maxWidth: 280,
    color: '#424841',
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 26,
  },
  heroLeaves: {
    position: 'absolute',
    right: 32,
    bottom: 16,
    width: 50,
    height: 56,
    zIndex:-999,
    opacity:0.4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 16,
    paddingBottom: 8,
  },
  pendingCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  pending: { flex: 1, color: colors.primary, fontFamily: fonts.medium, fontSize: 13, lineHeight: 20 },
  button: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#466349',
    boxShadow: '0 10px 15px -3px rgba(70, 99, 73, 0.2)',
  },
  buttonText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
  },
  tipCard: {
    minHeight: 113,
    padding: 25,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    borderRadius: 32,
    borderCurve: 'continuous',
    borderColor: 'rgba(255, 202, 152, 0.3)',
    boxShadow: 'none',
  },
  tipCopy: { flex: 1, gap: 4 },
  tipTitle: {
    color: '#7A532A',
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
  },
  tipText: {
    color: '#623F18',
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 19.5,
  },
  pressed: { opacity: 0.85 },
});
