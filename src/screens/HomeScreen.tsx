import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, StyleSheet, Text, View,useColorScheme } from 'react-native';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { SoftCard } from '../components/SoftCard';
import { StatCard } from '../components/StatCard';
import { useRecords } from '../hooks/useRecords';
import { RootStackParamList } from '../types/navigation';
import { average, getTodayRecords, mostCommon } from '../utils/stats';
import { AppColors, fonts, useAppTheme, useThemedStyles } from '../theme';

export function HomeScreen({ navigation }: { navigation: NativeStackNavigationProp<RootStackParamList> }) {
  const { colors } = useAppTheme();
  const scheme = useColorScheme();
  const styles = useThemedStyles(createStyles);
  const { records } = useRecords({}, { pageSize: 200 });
  const todayRecords = getTodayRecords(records);
  const pendingCount = records.filter((record) => record.syncStatus !== 'synced').length;
  const averageIntensity = average(todayRecords.map((record) => record.emotionIntensity));
  const commonCategory = mostCommon(todayRecords.map((record) => record.category));
  const hardestToday = todayRecords.length
    ? Math.max(...todayRecords.map((record) => record.emotionIntensity + record.decisionDifficulty))
    : 0;

  return (
    <Screen backgroundColor={colors.background} contentStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroCopy}>
          <View style={styles.heroHeading}>
            <Text style={styles.eyebrow}>Emotional Journal</Text>
            <Text style={styles.title}>{'今天，也留一点空间\n给自己。'}</Text>
          </View>
          <Text style={styles.subtitle}>记录不是为了责怪，而是为了看清反复出现的模式。</Text>
        </View>
        {scheme!='dark'?<Image
          accessibilityIgnoresInvertColors
          source={require('../../assets/home-hero-leaves.png')}
          style={styles.heroLeaves}
        />:''}
      </View>
      <View style={styles.grid}>
        <HapticPressable
          accessibilityRole="button"
          accessibilityLabel="查看纠结历史记录"
          feedback="selection"
          style={({ pressed }) => [styles.todayRecordsCard, pressed && styles.pressed]}
          onPress={() => navigation.navigate('History')}
        >
          <StatCard
            icon="calendar-outline"
            label="今日记录次数"
            value={todayRecords.length}
          />
        </HapticPressable>
        <StatCard
          icon="happy-outline"
          iconBackgroundColor={colors.warmSoft}
          iconColor={colors.warm}
          label="今日平均情绪"
          value={averageIntensity ? averageIntensity.toFixed(1) : '-'}
        />
        <StatCard
          compact
          icon="shapes-outline"
          iconBackgroundColor={colors.cardSecondary}
          iconColor={colors.textSecondary}
          label="今日常见分类"
          value={commonCategory ?? '暂无'}
        />
        <StatCard
          icon="flash-outline"
          iconBackgroundColor={colors.dangerSoft}
          iconColor={colors.danger}
          label="最高耗心力"
          value={hardestToday ? `${hardestToday}/20` : '-'}
        />
      </View>
      {pendingCount ? (
        <SoftCard colors={[colors.card, colors.brandSoft]} style={styles.pendingCard}>
          <Ionicons name="cloud-upload-outline" size={18} color={colors.brand} />
          <Text style={styles.pending}>有 {pendingCount} 条记录待同步，联网后会自动重试。</Text>
        </SoftCard>
      ) : null}
      <HapticPressable
        accessibilityRole="button"
        accessibilityLabel="记录一次纠结"
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Record')}
      >
        <Ionicons name="add" size={20} color={colors.buttonForeground} />
        <Text style={styles.buttonText}>记录一次纠结</Text>
      </HapticPressable>
      <SoftCard colors={[colors.warmSoft, colors.warmSoft]} style={styles.tipCard}>
        <Ionicons name="bulb-outline" size={20} color={colors.warm} />
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

const createStyles = (colors: AppColors) => ({
  content: { paddingTop: 32, gap: 32 },
  hero: {
    minHeight: 200,
    padding: 24,
    overflow: 'hidden',
    borderRadius: 32,
    borderCurve: 'continuous',
    // borderWidth: 1,
    // borderColor: 'rgba(194, 200, 191, 0.3)',
    backgroundColor: colors.card,
    boxShadow: `0 10px 40px -10px ${colors.shadow}`,
  },
  heroGlow: {
    position: 'absolute',
    top: -64,
    right: -64,
    width: 256,
    height: 256,
    borderRadius: 128,
    backgroundColor: colors.brandSoft,
  },
  heroCopy: { gap: 24 },
  heroHeading: { gap: 7 },
  eyebrow: {
    color: colors.brand,
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 20,
    letterSpacing: 1.4,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 26,
    lineHeight: 32.5,
    letterSpacing: -0.52,
  },
  subtitle: {
    maxWidth: 280,
    color: colors.textSecondary,
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
  todayRecordsCard: { flex: 1, minWidth: '46%', height: 140, borderRadius: 24 },
  pendingCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  pending: { flex: 1, color: colors.brand, fontFamily: fonts.medium, fontSize: 13, lineHeight: 20 },
  button: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.brand,
    boxShadow: `0 10px 15px -3px ${colors.shadow}`,
  },
  buttonText: {
    color: colors.buttonForeground,
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
    borderColor: colors.warm,
    boxShadow: 'none',
  },
  tipCopy: { flex: 1, gap: 4 },
  tipTitle: {
    color: colors.warm,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
  },
  tipText: {
    color: colors.warm,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 19.5,
  },
  pressed: { opacity: 0.85 },
});
