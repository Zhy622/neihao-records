import { useCallback, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
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
import { AppColors, fonts, useAppTheme, useThemedStyles } from '../theme';

function Field({
  icon,
  label,
  hint,
  children,
  onLayout,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  children: React.ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.field} onLayout={onLayout}>
      <View style={styles.labelRow}>
        <Ionicons name={icon} size={17} color={colors.brand} />
        <Text style={styles.label}>{label}</Text>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function ObservationDetailCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.observationCard}>
      <View style={styles.cardLabelRow}>
        <View style={styles.cardIcon}>
          <Ionicons name={icon} size={15} color={colors.brand} />
        </View>
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
      <Text selectable style={styles.cardValue}>{value || '未填写'}</Text>
    </View>
  );
}

function ReflectionCard({
  accent,
  icon,
  label,
  subtitle,
  value,
}: {
  accent: 'definition' | 'action';
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  value: string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.reflectionCard, accent === 'definition' ? styles.definitionCard : styles.actionCard]}>
      <View style={styles.reflectionHeader}>
        <View style={styles.reflectionIcon}>
          <Ionicons name={icon} size={18} color={colors.brand} />
        </View>
        <View style={styles.reflectionTitleWrap}>
          <Text style={styles.reflectionLabel}>{label}</Text>
          <Text style={styles.reflectionSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.reflectionContent}>
        <Text selectable style={styles.reflectionText}>{value || '未填写'}</Text>
      </View>
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
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const { session } = useAuth();
  const { alert } = useAppAlert();
  const scrollViewRef = useRef<ScrollView>(null);
  const formOffsetRef = useRef(0);
  const fieldOffsets = useRef<Record<string, number>>({});
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

  const recordFieldOffset = (field: string) => (event: LayoutChangeEvent) => {
    fieldOffsets.current[field] = event.nativeEvent.layout.y;
  };

  const revealInputArea = (field: string) => {
    setTimeout(() => {
      const y = formOffsetRef.current + (fieldOffsets.current[field] ?? 0) - 120;
      scrollViewRef.current?.scrollTo({ y: Math.max(y, 0), animated: true });
    }, 300);
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
    <Screen backgroundColor={colors.background} keyboardAvoiding keyboardAvoidingMode="fullscreen" scrollViewRef={scrollViewRef} contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerBody}>
          <Text style={styles.title}>{observation.alias}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={13} color={colors.placeholder} />
            <Text style={styles.date}>{new Date(observation.createdAt).toLocaleDateString('zh-CN')}</Text>
          </View>
        </View>
        <View style={styles.syncStatus}>
          <View style={[styles.syncDot, observation.syncStatus !== 'synced' && styles.pendingDot]} />
          <Text style={styles.syncText}>{observation.syncStatus === 'synced' ? '已同步' : '待同步'}</Text>
        </View>
      </View>

      <View style={styles.headerDivider} />

      {editing ? (
        <View style={styles.form} onLayout={(event) => { formOffsetRef.current = event.nativeEvent.layout.y; }}>
          <Field
            icon="person-outline"
            label="人物代号 *"
            hint="可以是昵称、角色名或只有你看得懂的代号。"
            onLayout={recordFieldOffset('alias')}
          >
            <TextInput
              value={alias}
              onChangeText={setAlias}
              onFocus={() => revealInputArea('alias')}
              placeholder="例如：A 同事 / 那位朋友 / 高中同学"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field
            icon="heart-outline"
            label="我对 TA 的主要情绪"
            hint="可以多选，复杂一点也没关系。"
          >
            <View style={styles.chips}>
              {PEOPLE_OBSERVATION_EMOTIONS.map((item, index) => (
                <HapticPressable
                  key={item}
                  feedback="selection"
                  style={({ pressed }) => [
                    styles.chip,
                    emotions.includes(item) && { backgroundColor: [colors.positiveSoft, colors.warmSoft, colors.purpleSoft, colors.cardSecondary][index % 4] },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => toggleEmotion(item)}
                >
                  <Text style={[styles.chipText, emotions.includes(item) && styles.selectedChipText]}>{item}</Text>
                </HapticPressable>
              ))}
            </View>
          </Field>
          <Field icon="location-outline" label="触发场景" onLayout={recordFieldOffset('triggerScene')}>
            <TextInput value={triggerScene} onChangeText={setTriggerScene} onFocus={() => revealInputArea('triggerScene')} placeholder="我是在什么情况下想到 TA 的？" placeholderTextColor={colors.placeholder} style={[styles.input, styles.multiline]} multiline />
          </Field>
          <Field icon="eye-off-outline" label="我轻蔑 TA 的点" hint="可以诚实一点写，先不急着评判自己。" onLayout={recordFieldOffset('contemptPoints')}>
            <TextInput value={contemptPoints} onChangeText={setContemptPoints} onFocus={() => revealInputArea('contemptPoints')} placeholder="我看不上的地方是什么？" placeholderTextColor={colors.placeholder} style={[styles.input, styles.multiline]} multiline />
          </Field>
          <Field icon="sparkles-outline" label="我自卑或羡慕 TA 的点" onLayout={recordFieldOffset('inferiorityOrEnvyPoints')}>
            <TextInput value={inferiorityOrEnvyPoints} onChangeText={setInferiorityOrEnvyPoints} onFocus={() => revealInputArea('inferiorityOrEnvyPoints')} placeholder="TA 的什么地方让我不舒服、羡慕或不服气？" placeholderTextColor={colors.placeholder} style={[styles.input, styles.multiline]} multiline />
          </Field>
          <Field icon="accessibility-outline" label="TA 比我强的具体能力" onLayout={recordFieldOffset('otherStrengths')}>
            <TextInput value={otherStrengths} onChangeText={setOtherStrengths} onFocus={() => revealInputArea('otherStrengths')} placeholder="例如：表达更直接、执行更快、更会争取资源" placeholderTextColor={colors.placeholder} style={[styles.input, styles.multiline]} multiline />
          </Field>
          <Field icon="shield-checkmark-outline" label="我比 TA 强或不弱的地方" onLayout={recordFieldOffset('myStrengths')}>
            <TextInput value={myStrengths} onChangeText={setMyStrengths} onFocus={() => revealInputArea('myStrengths')} placeholder="例如：更稳定、更细致、更愿意复盘" placeholderTextColor={colors.placeholder} style={[styles.input, styles.multiline]} multiline />
          </Field>
        </View>
      ) : (
        <View style={styles.details}>
          <View style={styles.emotions}>
            {observation.emotions.length ? observation.emotions.map((emotion, index) => (
              <Text key={emotion} style={[styles.emotion, { backgroundColor: [colors.positiveSoft, colors.warmSoft, colors.purpleSoft, colors.cardSecondary][index % 4] }]}>{emotion}</Text>
            )) : <Text style={[styles.emotion, styles.emptyEmotion]}>未选择情绪</Text>}
          </View>
          <ObservationDetailCard icon="location-outline" label="触发场景" value={observation.triggerScene} />
          <ObservationDetailCard icon="eye-off-outline" label="我轻蔑 TA 的点" value={observation.contemptPoints} />
          <ObservationDetailCard icon="sparkles-outline" label="我自卑或羡慕 TA 的点" value={observation.inferiorityOrEnvyPoints} />
          <ObservationDetailCard icon="accessibility-outline" label="TA 比我强的具体能力" value={observation.otherStrengths} />
          <ObservationDetailCard icon="shield-checkmark-outline" label="我比 TA 强或不弱的地方" value={observation.myStrengths} />
          <ReflectionCard
            accent="definition"
            icon="bulb-outline"
            label="重新定义这个人"
            subtitle="REDEFINING PERSPECTIVE"
            value={observation.personDefinition}
          />
          <ReflectionCard
            accent="action"
            icon="walk-outline"
            label="我可以学习的一个行动"
            subtitle="ACTIONABLE STEP"
            value={observation.learningAction}
          />
        </View>
      )}

      {editing ? (
        <View style={styles.preview}>
          <ReflectionCard
            accent="definition"
            icon="bulb-outline"
            label="重新定义这个人"
            subtitle="REDEFINING PERSPECTIVE"
            value={personDefinition}
          />
          <ReflectionCard
            accent="action"
            icon="walk-outline"
            label="我可以学习的一个行动"
            subtitle="ACTIONABLE STEP"
            value={learningAction}
          />
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
              <Ionicons name="checkmark-circle-outline" size={19} color={colors.buttonForeground} />
              <Text style={styles.primaryButtonText}>{saving ? '保存中...' : '保存修改'}</Text>
            </HapticPressable>
          </>
        ) : (
          <>
            <HapticPressable
              disabled={deleting}
              style={({ pressed }) => [styles.deleteButton, (pressed || deleting) && styles.pressed]}
              onPress={confirmDelete}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={styles.deleteButtonText}>{deleting ? '删除中...' : '删除'}</Text>
            </HapticPressable>
            <HapticPressable
              disabled={deleting}
              style={({ pressed }) => [styles.editButton, (pressed || deleting) && styles.pressed]}
              onPress={() => setEditing(true)}
            >
              <Ionicons name="create-outline" size={18} color={colors.buttonForeground} />
              <Text style={styles.editButtonText}>编辑</Text>
            </HapticPressable>
          </>
        )}
      </View>
    </Screen>
  );
}

const createStyles = (colors: AppColors) => ({
  content: { paddingTop: 24, paddingHorizontal: 20, paddingBottom: 120, gap: 18 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  avatar: { alignItems: 'center', backgroundColor: colors.positiveSoft, borderRadius: 24, height: 48, justifyContent: 'center', width: 48 },
  headerBody: { flex: 1, gap: 5 },
  date: { color: colors.placeholder, fontFamily: fonts.regular, fontSize: 12 },
  title: { color: colors.text, fontFamily: fonts.medium, fontSize: 24, lineHeight: 30 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  syncStatus: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  syncDot: { backgroundColor: colors.brand, borderRadius: 4, height: 7, width: 7 },
  pendingDot: { backgroundColor: colors.purple },
  syncText: { color: colors.brand, fontFamily: fonts.medium, fontSize: 12 },
  headerDivider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
  form: { gap: 32 },
  field: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: colors.text, fontFamily: fonts.medium, fontSize: 16 },
  hint: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13 },
  selectedChipText: { color: colors.brand, fontFamily: fonts.medium },
  input: {
    color: colors.text,
    minHeight: 56,
    backgroundColor: colors.input,
    borderRadius: 24,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  multiline: { minHeight: 116, textAlignVertical: 'top' },
  details: { gap: 12 },
  emotions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emotion: { borderRadius: 999, color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13, paddingHorizontal: 13, paddingVertical: 7 },
  emptyEmotion: { backgroundColor: colors.cardSecondary },
  observationCard: { backgroundColor: colors.card, borderRadius: 20, gap: 13, padding: 18, boxShadow: `0 5px 18px ${colors.shadow}` },
  cardLabelRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  cardIcon: { alignItems: 'center', backgroundColor: colors.brandSoft, borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  cardLabel: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13 },
  cardValue: { color: colors.text, fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
  reflectionCard: { borderRadius: 24, gap: 16, padding: 18 },
  definitionCard: { backgroundColor: colors.warmSoft },
  actionCard: { backgroundColor: colors.positiveSoft },
  reflectionHeader: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  reflectionIcon: { alignItems: 'center', backgroundColor: colors.cardSecondary, borderRadius: 15, height: 30, justifyContent: 'center', width: 30 },
  reflectionTitleWrap: { gap: 2 },
  reflectionLabel: { color: colors.text, fontFamily: fonts.medium, fontSize: 16 },
  reflectionSubtitle: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 9, letterSpacing: 0.7 },
  reflectionContent: { backgroundColor: colors.cardTemp, borderRadius: 16, padding: 15 },
  reflectionText: { color: colors.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  preview: { gap: 24 },
  actions: { flexDirection: 'row', gap: 16 },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    height: 52,
    borderRadius: 28,
    backgroundColor: colors.brand,
  },
  primaryButtonText: { color: colors.buttonForeground, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    height: 52,
    borderRadius: 28,
    backgroundColor: colors.cardSecondary,
  },
  secondaryButtonText: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  deleteButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    height: 52,
    borderRadius: 28,
    backgroundColor: colors.cardSecondary,
  },
  deleteButtonText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  editButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    height: 52,
    borderRadius: 28,
    backgroundColor: colors.brand,
  },
  editButtonText: { color: colors.buttonForeground, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  pressed: { opacity: 0.75 },
  empty: { color: colors.textSecondary, fontFamily: fonts.regular, textAlign: 'center', paddingVertical: 40 },
});
