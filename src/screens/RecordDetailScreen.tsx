import { useCallback, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { Chip } from '../components/Chip';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { deleteAndSyncRecord, syncRecordById } from '../sync/records-sync';
import { getRecord, updateRecord } from '../database/database';
import {
  CATEGORIES,
  Category,
  DilemmaRecord,
  EMOTIONS,
  Emotion,
  TIME_COSTS,
  TimeCost,
  WORTH_OPTIONS,
  WorthIt,
} from '../types/record';
import { RootStackParamList } from '../types/navigation';
import { colors, fonts } from '../theme';

const levels = Array.from({ length: 10 }, (_, index) => index + 1);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export function RecordDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'RecordDetail'>) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [record, setRecord] = useState<DilemmaRecord | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('工作');
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [emotionIntensity, setEmotionIntensity] = useState(5);
  const [decisionDifficulty, setDecisionDifficulty] = useState(5);
  const [timeCost, setTimeCost] = useState<TimeCost>('30分钟以内');
  const [thoughts, setThoughts] = useState('');
  const [finalDecision, setFinalDecision] = useState('');
  const [worthIt, setWorthIt] = useState<WorthIt>('说不清');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const applyRecord = useCallback((nextRecord: DilemmaRecord | null) => {
    setRecord(nextRecord);

    if (!nextRecord) {
      return;
    }

    setTitle(nextRecord.title);
    setCategory(nextRecord.category);
    setEmotions(nextRecord.emotions);
    setEmotionIntensity(nextRecord.emotionIntensity);
    setDecisionDifficulty(nextRecord.decisionDifficulty);
    setTimeCost(nextRecord.timeCost);
    setThoughts(nextRecord.thoughts);
    setFinalDecision(nextRecord.finalDecision);
    setWorthIt(nextRecord.worthIt);
  }, []);

  const loadRecord = useCallback(async () => {
    if (!session) {
      return;
    }

    const nextRecord = await getRecord(db, session.user.id, route.params.id);
    applyRecord(nextRecord);
    if (!nextRecord) {
      navigation.goBack();
    }
  }, [applyRecord, db, navigation, route.params.id, session]);

  useFocusEffect(useCallback(() => { void loadRecord(); }, [loadRecord]));

  const toggleEmotion = (emotion: Emotion) => {
    setEmotions((current) =>
      current.includes(emotion) ? current.filter((item) => item !== emotion) : [...current, emotion],
    );
  };

  const revealBottomFields = () => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
  };

  const save = async () => {
    if (!session || !record) {
      return;
    }

    if (!title.trim()) {
      Alert.alert('还差一点', '请写下这次纠结的事情。');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateRecord(db, session.user.id, record.id, {
        title,
        category,
        emotions,
        emotionIntensity,
        decisionDifficulty,
        timeCost,
        thoughts,
        finalDecision,
        worthIt,
      });

      if (!updated) {
        throw new Error('Record was not updated.');
      }

      const synced = await syncRecordById(db, session.user.id, updated.id);
      applyRecord((await getRecord(db, session.user.id, updated.id)) ?? updated);
      setEditing(false);

      if (!synced) {
        Alert.alert('已保存到本机', '暂时无法同步到服务器，联网后会自动重试。');
      }
    } catch {
      Alert.alert('保存失败', '这次修改暂时没有保存，请稍后再试。');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!session || !record) {
      return;
    }

    Alert.alert('删除这条记录？', '删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            const synced = await deleteAndSyncRecord(db, session.user.id, record.id);
            if (!synced) {
              Alert.alert('已从本机移除', '服务器删除会在联网后自动重试。');
            }
            navigation.goBack();
          } catch {
            Alert.alert('删除失败', '这条记录暂时没有删除，请稍后再试。');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (!record) {
    return (
      <Screen>
        <Text style={styles.empty}>正在读取记录…</Text>
      </Screen>
    );
  }

  return (
    <Screen keyboardAvoiding scrollViewRef={scrollViewRef} contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.date}>{new Date(record.createdAt).toLocaleString('zh-CN')}</Text>
        <Text style={styles.title}>{record.title}</Text>
        <Text style={styles.syncStatus}>{record.syncStatus === 'synced' ? '已同步' : '待同步'}</Text>
      </View>

      {editing ? (
        <View style={styles.form}>
          <Field label="这次纠结的事情 *">
            <TextInput value={title} onChangeText={setTitle} placeholder="例如：要不要接下这个任务" placeholderTextColor={colors.muted} style={styles.input} />
          </Field>
          <Field label="分类">
            <View style={styles.chips}>{CATEGORIES.map((item) => <Chip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />)}</View>
          </Field>
          <Field label="当时的感受">
            <View style={styles.chips}>{EMOTIONS.map((item) => <Chip key={item} label={item} selected={emotions.includes(item)} onPress={() => toggleEmotion(item)} />)}</View>
          </Field>
          <Field label={`情绪强度 · ${emotionIntensity}/10`}>
            <View style={styles.chips}>{levels.map((level) => <Chip key={level} label={String(level)} selected={emotionIntensity === level} onPress={() => setEmotionIntensity(level)} />)}</View>
          </Field>
          <Field label={`决策难度 · ${decisionDifficulty}/10`}>
            <View style={styles.chips}>{levels.map((level) => <Chip key={level} label={String(level)} selected={decisionDifficulty === level} onPress={() => setDecisionDifficulty(level)} />)}</View>
          </Field>
          <Field label="耗费时间">
            <View style={styles.chips}>{TIME_COSTS.map((item) => <Chip key={item} label={item} selected={timeCost === item} onPress={() => setTimeCost(item)} />)}</View>
          </Field>
          <Field label="当时反复出现的想法">
            <TextInput value={thoughts} onChangeText={setThoughts} onFocus={revealBottomFields} placeholder="脑海里一直在想什么？" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline />
          </Field>
          <Field label="最后怎么决定">
            <TextInput value={finalDecision} onChangeText={setFinalDecision} onFocus={revealBottomFields} placeholder="写下最终选择或暂时的处理方式" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline />
          </Field>
          <Field label="事后看是否值得纠结">
            <View style={styles.chips}>{WORTH_OPTIONS.map((item) => <Chip key={item} label={item} selected={worthIt === item} onPress={() => setWorthIt(item)} />)}</View>
          </Field>
        </View>
      ) : (
        <View style={styles.details}>
          <DetailLine label="分类" value={record.category} />
          <DetailLine label="感受" value={record.emotions.length ? record.emotions.join('、') : '未填写'} />
          <DetailLine label="情绪强度" value={`${record.emotionIntensity}/10`} />
          <DetailLine label="决策难度" value={`${record.decisionDifficulty}/10`} />
          <DetailLine label="耗费时间" value={record.timeCost} />
          <DetailLine label="事后看" value={record.worthIt} />
          <View style={styles.noteBlock}>
            <Text style={styles.detailLabel}>当时反复出现的想法</Text>
            <Text style={styles.note}>{record.thoughts || '未填写'}</Text>
          </View>
          <View style={styles.noteBlock}>
            <Text style={styles.detailLabel}>最后怎么决定</Text>
            <Text style={styles.note}>{record.finalDecision || '未填写'}</Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        {editing ? (
          <>
            <HapticPressable disabled={saving} style={({ pressed }) => [styles.secondaryButton, (pressed || saving) && styles.pressed]} onPress={() => { applyRecord(record); setEditing(false); }}>
              <Text style={styles.secondaryButtonText}>取消</Text>
            </HapticPressable>
            <HapticPressable disabled={saving} style={({ pressed }) => [styles.primaryButton, (pressed || saving) && styles.pressed]} onPress={() => void save()}>
              <Ionicons name="checkmark-circle-outline" size={19} color={colors.white} />
              <Text style={styles.primaryButtonText}>{saving ? '保存中…' : '保存修改'}</Text>
            </HapticPressable>
          </>
        ) : (
          <>
            <HapticPressable disabled={deleting} style={({ pressed }) => [styles.secondaryButton, (pressed || deleting) && styles.pressed]} onPress={() => setEditing(true)}>
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>编辑</Text>
            </HapticPressable>
            <HapticPressable disabled={deleting} style={({ pressed }) => [styles.deleteButton, (pressed || deleting) && styles.pressed]} onPress={confirmDelete}>
              <Ionicons name="trash-outline" size={18} color={colors.white} />
              <Text style={styles.deleteButtonText}>{deleting ? '删除中…' : '删除'}</Text>
            </HapticPressable>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  header: { gap: 8 },
  date: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 26, lineHeight: 34 },
  syncStatus: { color: colors.primary, fontFamily: fonts.semibold, fontSize: 13 },
  form: { gap: 16 },
  field: { gap: 9 },
  label: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 13, fontFamily: fonts.regular, fontSize: 15 },
  multiline: { minHeight: 92, textAlignVertical: 'top' },
  details: { gap: 12 },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailLabel: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14 },
  detailValue: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 15, textAlign: 'right' },
  noteBlock: { gap: 8, padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  note: { color: colors.text, fontFamily: fonts.regular, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 10 },
  primaryButton: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, padding: 16, borderRadius: 20, backgroundColor: colors.primary },
  primaryButtonText: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
  secondaryButton: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, padding: 16, borderRadius: 20, backgroundColor: colors.primarySoft },
  secondaryButtonText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 16 },
  deleteButton: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, padding: 16, borderRadius: 20, backgroundColor: colors.danger },
  deleteButtonText: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
  pressed: { opacity: 0.75 },
  empty: { color: colors.muted, fontFamily: fonts.regular, textAlign: 'center', paddingVertical: 40 },
});
