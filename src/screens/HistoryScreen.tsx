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
import { RecordCard } from '../components/RecordCard';
import { Screen } from '../components/Screen';
import { useRecords } from '../hooks/useRecords';
import { deleteAndSyncRecord } from '../sync/records-sync';
import { CATEGORIES, Category, DateRange, EMOTIONS, Emotion } from '../types/record';
import { RootStackParamList } from '../types/navigation';
import { colors, fonts } from '../theme';

const dateRanges: Array<{ label: string; value?: DateRange }> = [
  { label: '全部' },
  { label: '今天', value: 'today' },
  { label: '近7天', value: 'week' },
  { label: '近30天', value: 'month' },
];

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
  const { records, refresh, isLoading } = useRecords({ category, emotion, dateRange, search });
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
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>历史记录</Text>
        <Text style={styles.subtitle}>回看，是为了发现模式，不是重新审判自己。</Text>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="搜索事情或反复出现的想法"
        placeholderTextColor={colors.muted}
        style={styles.search}
      />

      <HapticPressable
        style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
        onPress={() => filterSheetRef.current?.present()}
      >
        <Ionicons name="options-outline" size={18} color={colors.primary} />
        <Text style={styles.filterButtonText}>
          {activeFilters ? `筛选条件 · ${activeFilters}` : '筛选条件'}
        </Text>
      </HapticPressable>

      <View style={styles.list}>
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.loadingText}>正在查询记录...</Text>
          </View>
        ) : records.length ? (
          records.map((record) => (
            <RecordCard
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
  header: { gap: 7, marginBottom: 4 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 27 },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 21 },
  search: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontFamily: fonts.regular,
  },
  filterButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
  },
  filterButtonText: { color: colors.primary, fontFamily: fonts.semibold, fontSize: 15 },
  filterTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 15, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { gap: 12 },
  loading: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 34 },
  loadingText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14 },
  sheetBackground: { borderRadius: 28, backgroundColor: '#FFFEFC' },
  sheetIndicator: { backgroundColor: '#D6D0C8' },
  sheetContent: { padding: 20, paddingBottom: 34, gap: 14 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  clearText: { color: colors.primary, fontFamily: fonts.semibold },
  pressed: { opacity: 0.75 },
});
