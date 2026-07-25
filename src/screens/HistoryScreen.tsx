import { useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { Chip } from '../components/Chip';
import { useAppAlert } from '../components/AppAlert';
import { EmptyState } from '../components/EmptyState';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { useRecords } from '../hooks/useRecords';
import { deleteAndSyncRecord } from '../sync/records-sync';
import { CATEGORIES, Category, DateRange, DilemmaRecord, EMOTIONS, Emotion } from '../types/record';
import { RootStackParamList } from '../types/navigation';
import { colors, fonts } from '../theme';

const dateRanges: Array<{ label: string; value?: DateRange }> = [
  { label: '全部' },
  { label: '今天', value: 'today' },
  { label: '近7天', value: 'week' },
  { label: '近30天', value: 'month' },
];

function HistoryRecordCard({
  record,
  onDelete,
  onOpen,
}: {
  record: DilemmaRecord;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const synced = record.syncStatus === 'synced';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleGroup}>
          <View style={styles.cardIcon}>
            <Ionicons name="document-text-outline" size={20} color="#466349" />
          </View>
          <Text numberOfLines={1} style={styles.cardTitle}>{record.title}</Text>
        </View>
        <Text style={styles.category}>{record.category}</Text>
      </View>

      <View style={styles.metrics}>
        <Text style={styles.metricLabel}>情绪</Text>
        <Text style={styles.metricValue}>{record.emotionIntensity}/10</Text>
        <Text style={styles.metricLabel}>决策</Text>
        <Text style={styles.metricValue}>{record.decisionDifficulty}/10</Text>
        <Ionicons name="time-outline" size={14} color="#424841" />
        <Text style={styles.metricLabel}>{record.timeCost}</Text>
      </View>

      <View style={styles.thoughtsWrap}>
        <Text numberOfLines={2} style={styles.thoughts}>{record.thoughts || '未填写当时反复出现的想法。'}</Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.recordStatus}>
          <Text style={styles.date}>{new Date(record.createdAt).toLocaleString('zh-CN')}</Text>
          <View style={[styles.syncBadge, !synced && styles.pendingBadge]}>
            <Ionicons name={synced ? 'sync-outline' : 'cloud-offline-outline'} size={10} color={synced ? '#466349' : '#665B7C'} />
            <Text style={[styles.syncText, !synced && styles.pendingText]}>{synced ? '已同步' : '待同步'}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <HapticPressable
            accessibilityRole="button"
            accessibilityLabel="查看记录详情"
            feedback="selection"
            hitSlop={10}
            style={styles.cardAction}
            onPress={onOpen}
          >
            <Ionicons name="chevron-forward" size={18} color="#424841" />
          </HapticPressable>
          <HapticPressable
            accessibilityRole="button"
            accessibilityLabel="删除记录"
            hitSlop={10}
            style={styles.cardAction}
            onPress={onDelete}
          >
            <Ionicons name="trash-outline" size={18} color="#F05B5B" />
          </HapticPressable>
        </View>
      </View>
    </View>
  );
}

export function HistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const filterSheetRef = useRef<BottomSheetModal>(null);
  const filterSnapPoints = useMemo(() => ['64%'], []);
  const db = useSQLiteContext();
  const { session } = useAuth();
  const { alert } = useAppAlert();
  const [category, setCategory] = useState<Category | undefined>();
  const [emotion, setEmotion] = useState<Emotion | undefined>();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [search, setSearch] = useState('');
  const {
    records,
    refresh,
    loadMore,
    isLoading,
    isLoadingMore,
    hasMore,
  } = useRecords({ category, emotion, dateRange, search });
  const activeFilters = [dateRange, category, emotion].filter(Boolean).length;

  const confirmDelete = (id: number) => {
    alert('删除这条记录？', '删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const synced = await deleteAndSyncRecord(db, session!.user.id, id);
          await refresh();
          if (!synced) {
            alert('已从本机移除', '服务器删除会在联网后自动重试。');
          }
        },
      },
    ]);
  };

  return (
    <Screen backgroundColor="#F7FAF8" contentStyle={styles.content}>
      <View style={styles.searchAndFilter}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={20} color="#737971" style={styles.searchIcon} />
          <TextInput
            accessibilityLabel="搜索事情或反复出现的想法"
            value={search}
            onChangeText={setSearch}
            placeholder="搜索事情或反复出现的想法"
            placeholderTextColor="rgba(115, 121, 113, 0.6)"
            style={styles.search}
          />
        </View>

        <HapticPressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
          onPress={() => filterSheetRef.current?.present()}
        >
          <Ionicons name="options-outline" size={18} color="#466349" />
          <Text style={styles.filterButtonText}>
            {activeFilters ? `筛选条件 · ${activeFilters}` : '筛选条件'}
          </Text>
        </HapticPressable>
      </View>

      <View style={styles.list}>
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>正在查询记录...</Text>
          </View>
        ) : records.length ? (
          records.map((record) => (
            <HistoryRecordCard
              key={record.id}
              record={record}
              onOpen={() => navigation.navigate('RecordDetail', { id: record.id })}
              onDelete={() => confirmDelete(record.id)}
            />
          ))
        ) : (
          <EmptyState
            icon="search-outline"
            title="没有找到记录"
            description="换一个时间、分类或关键词再看看。"
          />
        )}
        {!isLoading && records.length > 0 && hasMore ? (
          <HapticPressable
            disabled={isLoadingMore}
            style={({ pressed }) => [styles.loadMoreButton, (pressed || isLoadingMore) && styles.pressed]}
            onPress={() => void loadMore()}
          >
            {isLoadingMore ? <ActivityIndicator color={colors.primary} size="small" /> : null}
            <Text style={styles.loadMoreText}>{isLoadingMore ? '加载中...' : '加载更多'}</Text>
          </HapticPressable>
        ) : null}
      </View>

      <BottomSheetModal
        ref={filterSheetRef}
        snapPoints={filterSnapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.18} />
        )}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>筛选记录</Text>
            <HapticPressable
              feedback="selection"
              onPress={() => {
                setDateRange(undefined);
                setCategory(undefined);
                setEmotion(undefined);
              }}
            >
              <Text style={styles.clearText}>清空</Text>
            </HapticPressable>
          </View>

          <Text style={styles.filterTitle}>时间</Text>
          <View style={styles.chips}>
            {dateRanges.map((item) => (
              <Chip
                key={item.label}
                label={item.label}
                selected={dateRange === item.value}
                onPress={() => setDateRange(item.value)}
              />
            ))}
          </View>

          <Text style={styles.filterTitle}>分类</Text>
          <View style={styles.chips}>
            <Chip label="全部" selected={!category} onPress={() => setCategory(undefined)} />
            {CATEGORIES.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={category === item}
                onPress={() => setCategory(item)}
              />
            ))}
          </View>

          <Text style={styles.filterTitle}>感受</Text>
          <View style={styles.chips}>
            <Chip label="全部" selected={!emotion} onPress={() => setEmotion(undefined)} />
            {EMOTIONS.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={emotion === item}
                onPress={() => setEmotion(item)}
              />
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 32, paddingBottom: 128, gap: 24 },
  searchAndFilter: { gap: 16 },
  searchWrap: { height: 56, justifyContent: 'center' },
  search: {
    height: 56,
    paddingLeft: 48,
    paddingRight: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 10px 40px -10px rgba(70, 99, 73, 0.08)',
    color: '#181C1C',
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  searchIcon: { position: 'absolute', left: 16, zIndex: 1 },
  filterButton: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(202, 235, 201, 0.2)',
  },
  filterButtonText: { color: '#466349', fontFamily: fonts.medium, fontSize: 16, lineHeight: 24 },
  filterTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { gap: 16, paddingTop: 8 },
  card: {
    minHeight: 232,
    gap: 12,
    paddingHorizontal: 21,
    paddingVertical: 18,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 10px 40px -10px rgba(70, 99, 73, 0.08)',
  },
  cardHeader: { height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderCurve: 'continuous', backgroundColor: '#F7F7F2' },
  cardTitle: { flex: 1, color: '#181C1C', fontFamily: fonts.medium, fontSize: 18, lineHeight: 23 },
  category: { borderRadius: 999, backgroundColor: '#FFDCBD', color: '#623F18', fontFamily: fonts.medium, fontSize: 11, letterSpacing: 0.55, lineHeight: 17, paddingHorizontal: 12, paddingVertical: 4 },
  metrics: { height: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricLabel: { color: '#424841', fontFamily: fonts.medium, fontSize: 11, lineHeight: 16, opacity: 0.6 },
  metricValue: { color: '#181C1C', fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, marginRight: 12 },
  thoughtsWrap: { height: 48, paddingTop: 3, paddingBottom: 3 },
  thoughts: { color: '#424841', fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, opacity: 0.9 },
  cardFooter: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: 'rgba(194, 200, 191, 0.08)', paddingTop: 12 },
  recordStatus: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  date: { color: '#737971', fontFamily: fonts.medium, fontSize: 11, lineHeight: 17 },
  syncBadge: { height: 21, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, backgroundColor: 'rgba(202, 235, 201, 0.2)', paddingHorizontal: 8 },
  pendingBadge: { backgroundColor: '#F3F0FA' },
  syncText: { color: '#466349', fontFamily: fonts.medium, fontSize: 11, lineHeight: 17 },
  pendingText: { color: '#665B7C' },
  cardActions: { flexDirection: 'row', gap: 4 },
  cardAction: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  loading: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 34 },
  loadingText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14 },
  loadMoreButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 18,
  },
  loadMoreText: { color: colors.primary, fontFamily: fonts.semibold, fontSize: 14 },
  sheetBackground: { borderRadius: 28, backgroundColor: '#FFFEFC' },
  sheetIndicator: { backgroundColor: '#D6D0C8' },
  sheetContent: { padding: 20, paddingBottom: 34, gap: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  clearText: { color: colors.primary, fontFamily: fonts.semibold },
  pressed: { opacity: 0.75 },
});
