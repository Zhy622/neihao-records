import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { Chip } from '../components/Chip';
import { RecordCard } from '../components/RecordCard';
import { Screen } from '../components/Screen';
import { useRecords } from '../hooks/useRecords';
import { deleteAndSyncRecord } from '../sync/records-sync';
import { CATEGORIES, Category, DateRange, EMOTIONS, Emotion } from '../types/record';
import { RootStackParamList } from '../types/navigation';
import { colors } from '../theme';

const dateRanges: Array<{ label: string; value?: DateRange }> = [
  { label: '全部' },
  { label: '今天', value: 'today' },
  { label: '近7天', value: 'week' },
  { label: '近30天', value: 'month' },
];

export function HistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const db = useSQLiteContext();
  const { session } = useAuth();
  const [category, setCategory] = useState<Category | undefined>();
  const [emotion, setEmotion] = useState<Emotion | undefined>();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [search, setSearch] = useState('');
  const { records, refresh } = useRecords({ category, emotion, dateRange, search });

  const confirmDelete = (id: number) => {
    Alert.alert('删除这条记录？', '删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const synced = await deleteAndSyncRecord(db, session!.user.id, id);
          await refresh();
          if (!synced) {
            Alert.alert('已从本机移除', '服务器删除会在联网后自动重试。');
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}><Text style={styles.title}>历史记录</Text><Text style={styles.subtitle}>回看，是为了发现模式，不是重新审判自己。</Text></View>
      <TextInput value={search} onChangeText={setSearch} placeholder="搜索事情或反复出现的想法" placeholderTextColor={colors.muted} style={styles.search} />
      <Text style={styles.filterTitle}>时间</Text>
      <View style={styles.chips}>
        {dateRanges.map((item) => <Chip key={item.label} label={item.label} selected={dateRange === item.value} onPress={() => setDateRange(item.value)} />)}
      </View>
      <Text style={styles.filterTitle}>分类</Text>
      <View style={styles.chips}>
        <Chip label="全部" selected={!category} onPress={() => setCategory(undefined)} />
        {CATEGORIES.map((item) => <Chip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />)}
      </View>
      <Text style={styles.filterTitle}>感受</Text>
      <View style={styles.chips}>
        <Chip label="全部" selected={!emotion} onPress={() => setEmotion(undefined)} />
        {EMOTIONS.map((item) => <Chip key={item} label={item} selected={emotion === item} onPress={() => setEmotion(item)} />)}
      </View>
      <View style={styles.list}>
        {records.map((record) => (
          <RecordCard
            key={record.id}
            record={record}
            onOpen={() => navigation.navigate('RecordDetail', { id: record.id })}
            onDelete={() => confirmDelete(record.id)}
          />
        ))}
        {!records.length ? <Text style={styles.empty}>没有找到记录。</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 7, marginBottom: 4 },
  title: { color: colors.text, fontSize: 27, fontWeight: '700' },
  subtitle: { color: colors.muted, lineHeight: 21 },
  search: { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13 },
  filterTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { gap: 12 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 40 },
});
