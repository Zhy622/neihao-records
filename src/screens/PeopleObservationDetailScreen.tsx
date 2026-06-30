import { useCallback, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { Chip } from '../components/Chip';
import { useAppAlert } from '../components/AppAlert';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import {
  removePeopleObservationCache,
  upsertPeopleObservationCache,
} from '../cache/people-observations-cache';
import { deleteAndSyncPeopleObservation, syncPeopleObservationById } from '../sync/people-observations-sync';
import { getPeopleObservation, updatePeopleObservation } from '../database/database';
import {
  PEOPLE_OBSERVATION_EMOTIONS,
  PeopleObservation,
  PeopleObservationEmotion,
} from '../types/people-observation';
import { RootStackParamList } from '../types/navigation';
import { colors, fonts } from '../theme';

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

function NoteBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.noteBlock}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.note}>{value || '未填写'}</Text>
    </View>
  );
}

function buildPersonDefinition({
  alias,
  emotions,
  otherStrengths,
  myStrengths,
}: {
  alias: string;
  emotions: PeopleObservationEmotion[];
  otherStrengths: string;
  myStrengths: string;
}) {
  const name = alias.trim() || '这个人';
  const emotionText = emotions.length
    ? `我对 ${name} 的感觉里有${emotions.join('、')}`
    : `我还在辨认对 ${name} 的感觉`;
  const otherText = otherStrengths.trim()
    ? `，TA 的优势可能是：${otherStrengths.trim()}`
    : '，TA 身上有一些触动我的地方';
  const myText = myStrengths.trim()
    ? `。同时，我并不是空白的，我也有：${myStrengths.trim()}。`
    : '。这不意味着我更差，只说明这里有值得被看见的信息。';

  return `${emotionText}${otherText}${myText}`;
}

function buildLearningAction({
  otherStrengths,
  inferiorityOrEnvyPoints,
}: {
  otherStrengths: string;
  inferiorityOrEnvyPoints: string;
}) {
  const source = otherStrengths.trim() || inferiorityOrEnvyPoints.trim();

  if (!source) {
    return '先选一个最刺痛我的点，把它改写成一个可练习的小动作。';
  }

  return `这周只学习一个具体动作：从“${source}”里挑一件最小的事，做一次 15 分钟练习。`;
}

export function PeopleObservationDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'PeopleObservationDetail'>) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const { alert } = useAppAlert();
  const scrollViewRef = useRef<ScrollView>(null);
  const [observation, setObservation] = useState<PeopleObservation | null>(null);
  const [editing, setEditing] = useState(false);
  const [alias, setAlias] = useState('');
  const [emotions, setEmotions] = useState<PeopleObservationEmotion[]>([]);
  const [triggerScene, setTriggerScene] = useState('');
  const [contemptPoints, setContemptPoints] = useState('');
  const [inferiorityOrEnvyPoints, setInferiorityOrEnvyPoints] = useState('');
  const [otherStrengths, setOtherStrengths] = useState('');
  const [myStrengths, setMyStrengths] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const applyObservation = useCallback((nextObservation: PeopleObservation | null) => {
    setObservation(nextObservation);

    if (!nextObservation) {
      return;
    }

    setAlias(nextObservation.alias);
    setEmotions(nextObservation.emotions);
    setTriggerScene(nextObservation.triggerScene);
    setContemptPoints(nextObservation.contemptPoints);
    setInferiorityOrEnvyPoints(nextObservation.inferiorityOrEnvyPoints);
    setOtherStrengths(nextObservation.otherStrengths);
    setMyStrengths(nextObservation.myStrengths);
  }, []);

  const loadObservation = useCallback(async () => {
    if (!session) {
      return;
    }

    const nextObservation = await getPeopleObservation(db, session.user.id, route.params.id);
    applyObservation(nextObservation);
    if (!nextObservation) {
      navigation.goBack();
    }
  }, [applyObservation, db, navigation, route.params.id, session]);

  useFocusEffect(useCallback(() => { void loadObservation(); }, [loadObservation]));

  const toggleEmotion = (emotion: PeopleObservationEmotion) => {
    setEmotions((current) =>
      current.includes(emotion) ? current.filter((item) => item !== emotion) : [...current, emotion],
    );
  };

  const revealBottomFields = () => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
  };

  const save = async () => {
    if (!session || !observation) {
      return;
    }

    if (!alias.trim()) {
      alert('还差一点', '请先写下这个人的代号。');
      return;
    }

    if (!emotions.length) {
      alert('还差一点', '请选择至少一种主要情绪。');
      return;
    }

    const personDefinition = buildPersonDefinition({
      alias,
      emotions,
      otherStrengths,
      myStrengths,
    });
    const learningAction = buildLearningAction({
      otherStrengths,
      inferiorityOrEnvyPoints,
    });

    try {
      setSaving(true);
      const updated = await updatePeopleObservation(db, session.user.id, observation.id, {
        alias,
        emotions,
        triggerScene,
        contemptPoints,
        inferiorityOrEnvyPoints,
        otherStrengths,
        myStrengths,
        personDefinition,
        learningAction,
      });

      if (!updated) {
        throw new Error('People observation was not updated.');
      }

      const synced = await syncPeopleObservationById(db, session.user.id, updated.id);
      const latest = (await getPeopleObservation(db, session.user.id, updated.id)) ?? updated;
      upsertPeopleObservationCache(session.user.id, latest, { animate: false });
      applyObservation(latest);
      setEditing(false);

      if (!synced) {
        alert('已保存到本机', '暂时无法同步到服务器，联网后会自动重试。');
      }
    } catch {
      alert('保存失败', '这次修改暂时没有保存，请稍后再试。');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!session || !observation) {
      return;
    }

    alert('删除这次观照？', '删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            const synced = await deleteAndSyncPeopleObservation(db, session.user.id, observation.id);
            if (!synced) {
              alert('已从本机移除', '服务器删除会在联网后自动重试。');
            }
            removePeopleObservationCache(session.user.id, observation.id);
            navigation.goBack();
          } catch {
            alert('删除失败', '这次观照暂时没有删除，请稍后再试。');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (!observation) {
    return (
      <Screen>
        <Text style={styles.empty}>正在读取观照...</Text>
      </Screen>
    );
  }

  const personDefinition = buildPersonDefinition({
    alias,
    emotions,
    otherStrengths,
    myStrengths,
  });
  const learningAction = buildLearningAction({
    otherStrengths,
    inferiorityOrEnvyPoints,
  });

  return (
    <Screen keyboardAvoiding scrollViewRef={scrollViewRef} contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.date}>{new Date(observation.createdAt).toLocaleString('zh-CN')}</Text>
        <Text style={styles.title}>{observation.alias}</Text>
        <Text style={styles.syncStatus}>{observation.syncStatus === 'synced' ? '已同步' : '待同步'}</Text>
      </View>

      {editing ? (
        <View style={styles.form}>
          <Field label="人物代号 *">
            <TextInput
              value={alias}
              onChangeText={setAlias}
              placeholder="例如：A 同事 / 那位朋友 / 高中同学"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>
          <Field label="我对 TA 的主要情绪">
            <View style={styles.chips}>
              {PEOPLE_OBSERVATION_EMOTIONS.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  selected={emotions.includes(item)}
                  onPress={() => toggleEmotion(item)}
                />
              ))}
            </View>
          </Field>
          <Field label="触发场景">
            <TextInput value={triggerScene} onChangeText={setTriggerScene} placeholder="我是在什么情况下想到 TA 的？" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline />
          </Field>
          <Field label="我轻蔑 TA 的点">
            <TextInput value={contemptPoints} onChangeText={setContemptPoints} onFocus={revealBottomFields} placeholder="我看不上的地方是什么？" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline />
          </Field>
          <Field label="我自卑或羡慕 TA 的点">
            <TextInput value={inferiorityOrEnvyPoints} onChangeText={setInferiorityOrEnvyPoints} onFocus={revealBottomFields} placeholder="TA 的什么地方让我不舒服、羡慕或不服气？" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline />
          </Field>
          <Field label="TA 比我强的具体能力">
            <TextInput value={otherStrengths} onChangeText={setOtherStrengths} onFocus={revealBottomFields} placeholder="例如：表达更直接、执行更快、更会争取资源" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline />
          </Field>
          <Field label="我比 TA 强或不弱的地方">
            <TextInput value={myStrengths} onChangeText={setMyStrengths} onFocus={revealBottomFields} placeholder="例如：更稳定、更细致、更愿意复盘" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline />
          </Field>
        </View>
      ) : (
        <View style={styles.details}>
          <DetailLine label="主要情绪" value={observation.emotions.length ? observation.emotions.join('、') : '未填写'} />
          <NoteBlock label="触发场景" value={observation.triggerScene} />
          <NoteBlock label="我轻蔑 TA 的点" value={observation.contemptPoints} />
          <NoteBlock label="我自卑或羡慕 TA 的点" value={observation.inferiorityOrEnvyPoints} />
          <NoteBlock label="TA 比我强的具体能力" value={observation.otherStrengths} />
          <NoteBlock label="我比 TA 强或不弱的地方" value={observation.myStrengths} />
          <NoteBlock label="重新定义这个人" value={observation.personDefinition} />
          <NoteBlock label="我可以学习的一个行动" value={observation.learningAction} />
        </View>
      )}

      {editing ? (
        <View style={styles.preview}>
          <NoteBlock label="重新定义这个人" value={personDefinition} />
          <NoteBlock label="我可以学习的一个行动" value={learningAction} />
        </View>
      ) : null}

      <View style={styles.actions}>
        {editing ? (
          <>
            <HapticPressable
              disabled={saving}
              style={({ pressed }) => [styles.secondaryButton, (pressed || saving) && styles.pressed]}
              onPress={() => { applyObservation(observation); setEditing(false); }}
            >
              <Text style={styles.secondaryButtonText}>取消</Text>
            </HapticPressable>
            <HapticPressable
              disabled={saving}
              style={({ pressed }) => [styles.primaryButton, (pressed || saving) && styles.pressed]}
              onPress={() => void save()}
            >
              <Ionicons name="checkmark-circle-outline" size={19} color={colors.white} />
              <Text style={styles.primaryButtonText}>{saving ? '保存中...' : '保存修改'}</Text>
            </HapticPressable>
          </>
        ) : (
          <>
            <HapticPressable
              disabled={deleting}
              style={({ pressed }) => [styles.secondaryButton, (pressed || deleting) && styles.pressed]}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>编辑</Text>
            </HapticPressable>
            <HapticPressable
              disabled={deleting}
              style={({ pressed }) => [styles.deleteButton, (pressed || deleting) && styles.pressed]}
              onPress={confirmDelete}
            >
              <Ionicons name="trash-outline" size={18} color={colors.white} />
              <Text style={styles.deleteButtonText}>{deleting ? '删除中...' : '删除'}</Text>
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
  input: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  multiline: { minHeight: 92, textAlignVertical: 'top' },
  details: { gap: 12 },
  detailLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14 },
  detailValue: { flex: 1, color: colors.text, fontFamily: fonts.semibold, fontSize: 15, textAlign: 'right' },
  noteBlock: { gap: 8, padding: 16, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  note: { color: colors.text, fontFamily: fonts.regular, lineHeight: 22 },
  preview: { gap: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
  },
  secondaryButtonText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 16 },
  deleteButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.danger,
  },
  deleteButtonText: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
  pressed: { opacity: 0.75 },
  empty: { color: colors.muted, fontFamily: fonts.regular, textAlign: 'center', paddingVertical: 40 },
});
