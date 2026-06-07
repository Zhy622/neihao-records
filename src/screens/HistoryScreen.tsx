import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Chip } from '../components/Chip';
import { RecordCard } from '../components/RecordCard';
import { Screen } from '../components/Screen';
import { deleteRecord } from '../database/database';
import { useRecords } from '../hooks/useRecords';
import { CATEGORIES, Category } from '../types/record';
import { colors } from '../theme';

export function HistoryScreen() {
  const db = useSQLiteContext();
  const [category, setCategory] = useState<Category | undefined>();
  const [search, setSearch] = useState('');
  const { records, refresh } = useRecords({ category, search });

  const confirmDelete = (id: number) => {
    Alert.alert('删除这条记录？', '删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => { await deleteRecord(db, id); await refresh(); } },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}><Text style={styles.title}>历史记录</Text><Text style={styles.subtitle}>回看，是为了发现模式，不是重新审判自己。</Text></View>
      <TextInput value={search} onChangeText={setSearch} placeholder="搜索事情或反复出现的想法" placeholderTextColor={colors.muted} style={styles.search} />
      <View style={styles.chips}>
        <Chip label="全部" selected={!category} onPress={() => setCategory(undefined)} />
        {CATEGORIES.map((item) => <Chip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />)}
      </View>
      <View style={styles.list}>
        {records.map((record) => <RecordCard key={record.id} record={record} onDelete={() => confirmDelete(record.id)} />)}
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { gap: 12 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 40 },
});
