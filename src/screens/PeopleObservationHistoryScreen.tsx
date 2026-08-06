import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EmptyState } from '../components/EmptyState';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { SoftCard } from '../components/SoftCard';
import { SyncBadge } from '../components/SyncBadge';
import { usePeopleObservations } from '../hooks/usePeopleObservations';
import { RootStackParamList } from '../types/navigation';
import { PeopleObservation } from '../types/people-observation';
import { AppColors, fonts, useAppTheme, useThemedStyles } from '../theme';

function PeopleObservationCard({
  animate,
  observation,
  onOpen,
}: {
  animate: boolean;
  observation: PeopleObservation;
  onOpen: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Animated.View entering={animate ? FadeInUp.duration(260).springify().damping(18) : undefined}>
      <HapticPressable accessibilityRole="button" accessibilityLabel={`查看观照：${observation.alias}`} feedback="selection" onPress={onOpen}>
        <SoftCard colors={[colors.card, colors.card]} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="people-outline" size={18} color={colors.brand} />
            </View>
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.alias}>
              {observation.alias}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <SyncBadge compact status={observation.syncStatus} />
            <Ionicons name="chevron-forward" size={17} color={colors.placeholder} />
          </View>
        </View>

        <View style={styles.tags}>
          {(observation.emotions.length ? observation.emotions : ['未选择情绪']).map((emotion, index) => (
            <Text key={emotion} style={[styles.tag, { backgroundColor: [colors.brandSoft, colors.purpleSoft, colors.warmSoft, colors.cardSecondary][index % 4] }]}>
              {emotion}
            </Text>
          ))}
        </View>

        {observation.triggerScene ? (
          <Text style={styles.bodyText} numberOfLines={2}>{observation.triggerScene}</Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.date}>{new Date(observation.createdAt).toLocaleString('zh-CN')}</Text>
        </View>
        </SoftCard>
      </HapticPressable>
    </Animated.View>
  );
}

export function PeopleObservationHistoryScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    peopleObservations,
    animatedObservationIds,
    loadMore,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
  } = usePeopleObservations();

  return (
    <Screen backgroundColor={colors.background} contentStyle={styles.content}>
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.loadingText}>正在查询人物观照...</Text>
        </View>
      ) : peopleObservations.length ? (
        <>
          {isRefreshing ? (
            <View style={styles.refreshing}>
              <ActivityIndicator color={colors.brand} size="small" />
              <Text style={styles.refreshingText}>同步中...</Text>
            </View>
          ) : null}
          <View style={styles.list}>
            {peopleObservations.map((observation) => (
              <PeopleObservationCard
                key={observation.id}
                animate={animatedObservationIds.has(observation.id)}
                observation={observation}
                onOpen={() => navigation.navigate('PeopleObservationDetail', { id: observation.id })}
              />
            ))}
            {hasMore ? (
              <HapticPressable
                disabled={isLoadingMore}
                style={({ pressed }) => [styles.loadMoreButton, (pressed || isLoadingMore) && styles.pressed]}
                onPress={() => void loadMore()}
              >
                {isLoadingMore ? <ActivityIndicator color={colors.brand} size="small" /> : null}
                <Text style={styles.loadMoreText}>{isLoadingMore ? '加载中...' : '加载更多'}</Text>
              </HapticPressable>
            ) : null}
          </View>
        </>
      ) : (
        <EmptyState
          icon="people-outline"
          title="还没有观照"
          description="之后这里会保存你写下的观照，帮助你回看：哪些人、哪些情绪、哪些能力反复照见了自己。"
        />
      )}

      {!isLoading && !peopleObservations.length ? (
        <HapticPressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={() => navigation.navigate('PeopleObservation')}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.buttonForeground} />
          <Text style={styles.buttonText}>新增观照</Text>
        </HapticPressable>
      ) : null}
    </Screen>
  );
}

const createStyles = (colors: AppColors) => ({
  content: { paddingTop: 24, paddingHorizontal: 30, paddingBottom: 130 },
  loading: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 34 },
  loadingText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 14 },
  refreshing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  refreshingText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13 },
  list: { gap: 16 },
  loadMoreButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.brandSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 18,
  },
  loadMoreText: { color: colors.brand, fontFamily: fonts.semibold, fontSize: 14 },
  card: {
    minHeight: 200,
    gap: 12,
    padding: 20,
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: 0,
    boxShadow: 'none',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 22,
    backgroundColor: colors.cardSecondary,
  },
  alias: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    color: colors.textSecondary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  bodyText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21 },
  cardFooter: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { color: colors.placeholder, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  button: {
    padding: 15,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.brand,
  },
  buttonText: { color: colors.buttonForeground, fontFamily: fonts.bold, fontSize: 16 },
  pressed: { opacity: 0.8 },
});
