import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { EmptyState } from '../components/EmptyState';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { SoftCard } from '../components/SoftCard';
import { SyncBadge } from '../components/SyncBadge';
import { usePeopleObservations } from '../hooks/usePeopleObservations';
import { RootStackParamList } from '../types/navigation';
import { PeopleObservation } from '../types/people-observation';
import { colors, fonts } from '../theme';

function PeopleObservationCard({
  animate,
  observation,
  onOpen,
}: {
  animate: boolean;
  observation: PeopleObservation;
  onOpen: () => void;
}) {
  return (
    <Animated.View entering={animate ? FadeInUp.duration(260).springify().damping(18) : undefined}>
      <HapticPressable feedback="selection" onPress={onOpen}>
        <SoftCard colors={['#FFFEFC', '#F3F0FA']} style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
            </View>
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.alias}>
              {observation.alias}
            </Text>
          </View>
          <View style={styles.cardActions}>
            <SyncBadge status={observation.syncStatus} />
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.emotions} numberOfLines={1}>
          {observation.emotions.length ? observation.emotions.join('、') : '未选择情绪'}
        </Text>

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

export function PeopleObservationHistoryScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'PeopleObservationHistory'>) {
  const { peopleObservations, animatedObservationIds, isLoading, isRefreshing } = usePeopleObservations();

  return (
    <Screen contentStyle={styles.content}>
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>正在查询人物观照...</Text>
        </View>
      ) : peopleObservations.length ? (
        <>
          {isRefreshing ? (
            <View style={styles.refreshing}>
              <ActivityIndicator color={colors.primary} size="small" />
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
          </View>
        </>
      ) : (
        <EmptyState
          icon="people-outline"
          title="还没有人物观照"
          description="之后这里会保存你写下的人物观照，帮助你回看：哪些人、哪些情绪、哪些能力反复照见了自己。"
        />
      )}

      {!isLoading && !peopleObservations.length ? (
        <HapticPressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={() => navigation.navigate('PeopleObservation')}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.white} />
          <Text style={styles.buttonText}>新增人物观照</Text>
        </HapticPressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  loading: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 34 },
  loadingText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14 },
  refreshing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  refreshingText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  list: { gap: 12 },
  card: { gap: 9, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
  },
  alias: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 17 },
  emotions: {
    alignSelf: 'flex-start',
    color: '#665B7C',
    backgroundColor: '#F3F0FA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  bodyText: { color: colors.text, fontFamily: fonts.regular, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
  button: {
    padding: 15,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.primary,
  },
  buttonText: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
  pressed: { opacity: 0.8 },
});
