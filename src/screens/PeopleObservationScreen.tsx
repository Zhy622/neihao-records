import { useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Keyboard, LayoutChangeEvent, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { Chip } from '../components/Chip';
import { useAppAlert } from '../components/AppAlert';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { createPeopleObservation, getPeopleObservation } from '../database/database';
import { upsertPeopleObservationCache } from '../cache/people-observations-cache';
import { syncPeopleObservationById } from '../sync/people-observations-sync';
import {
  PEOPLE_OBSERVATION_EMOTIONS,
  PeopleObservationEmotion,
} from '../types/people-observation';
import { RootStackParamList } from '../types/navigation';
import { colors, fonts } from '../theme';

const emotions = PEOPLE_OBSERVATION_EMOTIONS;

function Field({
  label,
  children,
  hint,
  icon,
  onLayout,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View style={styles.field} onLayout={onLayout}>
      <View style={styles.labelRow}>
        <Ionicons name={icon} size={17} color="#5D655E" />
        <Text style={styles.label}>{label}</Text>
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

function buildPersonDefinition({
  alias,
  selectedEmotions,
  otherStrengths,
  myStrengths,
}: {
  alias: string;
  selectedEmotions: PeopleObservationEmotion[];
  otherStrengths: string;
  myStrengths: string;
}) {
  const name = alias.trim() || '这个人';
  const emotionText = selectedEmotions.length
    ? `我对 ${name} 的感觉里有${selectedEmotions.join('、')}`
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
  admirePoints,
}: {
  otherStrengths: string;
  admirePoints: string;
}) {
  const source = otherStrengths.trim() || admirePoints.trim();

  if (!source) {
    return '先选一个最刺痛我的点，把它改写成一个可练习的小动作。';
  }

  return `这周只学习一个具体动作：从“${source}”里挑一件最小的事，做一次 15 分钟练习。`;
}

export function PeopleObservationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const db = useSQLiteContext();
  const { session } = useAuth();
  const { alert } = useAppAlert();
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldOffsets = useRef<Record<string, number>>({});
  const emotionSheetRef = useRef<BottomSheetModal>(null);
  const emotionSnapPoints = useMemo(() => ['46%'], []);
  const [alias, setAlias] = useState('');
  const [selectedEmotions, setSelectedEmotions] = useState<PeopleObservationEmotion[]>([]);
  const [triggerScene, setTriggerScene] = useState('');
  const [contemptPoints, setContemptPoints] = useState('');
  const [admirePoints, setAdmirePoints] = useState('');
  const [otherStrengths, setOtherStrengths] = useState('');
  const [myStrengths, setMyStrengths] = useState('');
  const [saving, setSaving] = useState(false);

  const personDefinition = useMemo(
    () => buildPersonDefinition({ alias, selectedEmotions, otherStrengths, myStrengths }),
    [alias, myStrengths, otherStrengths, selectedEmotions],
  );
  const learningAction = useMemo(
    () => buildLearningAction({ admirePoints, otherStrengths }),
    [admirePoints, otherStrengths],
  );

  const toggleEmotion = (emotion: PeopleObservationEmotion) => {
    setSelectedEmotions((current) =>
      current.includes(emotion) ? current.filter((item) => item !== emotion) : [...current, emotion],
    );
  };

  const openEmotionSheet = () => {
    Keyboard.dismiss();
    setTimeout(() => emotionSheetRef.current?.present(), 120);
  };

  const recordFieldOffset = (field: string) => (event: LayoutChangeEvent) => {
    fieldOffsets.current[field] = event.nativeEvent.layout.y;
  };

  const revealInputArea = (field: string) => {
    setTimeout(() => {
      const y = fieldOffsets.current[field] ?? 0;
      scrollViewRef.current?.scrollTo({ y: Math.max(y - 16, 0), animated: true });
    }, 260);
  };

  const finishObservation = async () => {
    if (!alias.trim()) {
      alert('还差一点', '请先写下这个人的代号。');
      return;
    }
    if (!selectedEmotions.length) {
      alert('还差一点', '请选择至少一种主要情绪。');
      return;
    }

    try {
      setSaving(true);
      const localObservation = await createPeopleObservation(db, session!.user.id, {
        alias,
        emotions: selectedEmotions,
        triggerScene,
        contemptPoints,
        inferiorityOrEnvyPoints: admirePoints,
        otherStrengths,
        myStrengths,
        personDefinition,
        learningAction,
      });

      if (!localObservation) {
        throw new Error('Local people observation was not created.');
      }

      let synced = false;
      try {
        synced = await syncPeopleObservationById(db, session!.user.id, localObservation.id);
      } catch {
        synced = false;
      }

      upsertPeopleObservationCache(
        session!.user.id,
        (await getPeopleObservation(db, session!.user.id, localObservation.id)) ?? localObservation,
      );
      setSaving(false);
      if (synced) {
        navigation.goBack();
      } else {
        alert('已保存到本机', '暂时无法同步到服务器，联网后会自动重试。', [
          { text: '知道了', onPress: () => navigation.goBack() },
        ]);
      }
    } catch {
      alert('保存失败', '观照暂时没有保存，请稍后再试。');
      setSaving(false);
    }
  };

  return (
    <Screen
      backgroundColor="#F7FAF8"
      keyboardAvoiding
      keyboardAvoidingMode="fullscreen"
      scrollViewRef={scrollViewRef}
      contentStyle={styles.content}
    >
      <View style={styles.quoteCard}>
        <View style={styles.quoteAccent} />
        <Text style={styles.quote}>以人为镜，映照己身。</Text>
        <Text style={styles.quoteSignature}>— 观照 · 小记</Text>
      </View>

      <Field icon="person-outline" label="人物代号" hint="可以是昵称、角色名或只有你看得懂的代号。" onLayout={recordFieldOffset('alias')}>
        <TextInput
          value={alias}
          onChangeText={setAlias}
          onFocus={() => revealInputArea('alias')}
          placeholder="例如：A 同事 / 那位朋友 / 高中同学"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </Field>

      <Field icon="heart-outline" label="我对 TA 的主要情绪" hint="可以多选，复杂一点也没关系。">
        <HapticPressable style={styles.selector} onPress={openEmotionSheet}>
          <Text numberOfLines={1} style={styles.selectorText}>
            {selectedEmotions.length ? selectedEmotions.join('、') : '选择主要情绪'}
          </Text>
          <Ionicons name="chevron-down-outline" size={18} color={colors.primary} />
        </HapticPressable>
      </Field>

      <Field icon="location-outline" label="触发场景" onLayout={recordFieldOffset('triggerScene')}>
        <TextInput
          value={triggerScene}
          onChangeText={setTriggerScene}
          onFocus={() => revealInputArea('triggerScene')}
          placeholder="我是在什么情况下想到 TA 的？"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.multiline]}
          multiline
        />
      </Field>

      <Field icon="eye-off-outline" label="我轻蔑 TA 的点" hint="可以诚实一点写，先不急着评判自己。" onLayout={recordFieldOffset('contemptPoints')}>
        <TextInput
          value={contemptPoints}
          onChangeText={setContemptPoints}
          onFocus={() => revealInputArea('contemptPoints')}
          placeholder="我看不上的地方是什么？"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.multiline]}
          multiline
        />
      </Field>

      <Field icon="sparkles-outline" label="我自卑或羡慕 TA 的点" onLayout={recordFieldOffset('admirePoints')}>
        <TextInput
          value={admirePoints}
          onChangeText={setAdmirePoints}
          onFocus={() => revealInputArea('admirePoints')}
          placeholder="TA 的什么地方让我不舒服、羡慕或不服气？"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.multiline]}
          multiline
        />
      </Field>

      <Field icon="accessibility-outline" label="TA 比我强的具体能力" onLayout={recordFieldOffset('otherStrengths')}>
        <TextInput
          value={otherStrengths}
          onChangeText={setOtherStrengths}
          onFocus={() => revealInputArea('otherStrengths')}
          placeholder="例如：表达更直接、执行更快、更会争取资源"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.multiline]}
          multiline
        />
      </Field>

      <Field icon="shield-checkmark-outline" label="我比 TA 强或不弱的地方" onLayout={recordFieldOffset('myStrengths')}>
        <TextInput
          value={myStrengths}
          onChangeText={setMyStrengths}
          onFocus={() => revealInputArea('myStrengths')}
          placeholder="例如：更稳定、更细致、更愿意复盘"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.multiline]}
          multiline
        />
      </Field>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, styles.definitionCard]}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIcon}>
              <Ionicons name="bulb-outline" size={18} color="#466349" />
            </View>
            <View style={styles.summaryTitleWrap}>
              <Text style={styles.summaryTitle}>重新定义这个人</Text>
              <Text style={styles.summarySubtitle}>REDEFINING PERSPECTIVE</Text>
            </View>
          </View>
          <View style={styles.summaryResult}>
            <Text style={styles.summaryText}>{personDefinition}</Text>
          </View>
        </View>

        <View style={[styles.summaryCard, styles.actionCard]}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIcon}>
              <Ionicons name="walk-outline" size={18} color="#466349" />
            </View>
            <View style={styles.summaryTitleWrap}>
              <Text style={styles.summaryTitle}>我可以学习的一个行动</Text>
              <Text style={styles.summarySubtitle}>ACTIONABLE STEP</Text>
            </View>
          </View>
          <View style={styles.summaryResult}>
            <Text style={styles.summaryText}>{learningAction}</Text>
          </View>
        </View>
      </View>

      <HapticPressable
        disabled={saving}
        style={({ pressed }) => [styles.finishButton, (pressed || saving) && styles.pressed]}
        onPress={finishObservation}
      >
        <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
        <Text style={styles.finishText}>{saving ? '保存中...' : '完成这次观照'}</Text>
      </HapticPressable>

      <BottomSheetModal
        ref={emotionSheetRef}
        snapPoints={emotionSnapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.18} />
        )}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>选择主要情绪</Text>
            <HapticPressable style={styles.sheetDoneButton} onPress={() => emotionSheetRef.current?.dismiss()}>
              <Text style={styles.sheetDoneText}>完成</Text>
            </HapticPressable>
          </View>
          <View style={styles.chips}>
            {emotions.map((emotion) => (
              <Chip
                key={emotion}
                label={emotion}
                selected={selectedEmotions.includes(emotion)}
                onPress={() => toggleEmotion(emotion)}
              />
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 24, paddingHorizontal: 20, paddingBottom: 150, gap: 32 },
  quoteCard: {
    minHeight: 108,
    overflow: 'hidden',
    justifyContent: 'space-between',
    padding: 24,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#EDF3F0',
    boxShadow: '0 12px 24px -14px rgba(70, 99, 73, 0.12)',
  },
  quoteAccent: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 5, borderRadius: 4, backgroundColor: '#466349' },
  quote: { color: '#252B26', fontFamily: fonts.medium, fontSize: 19, lineHeight: 26 },
  quoteSignature: { alignSelf: 'flex-end', color: '#5A625B', fontFamily: fonts.regular, fontSize: 12 },
  field: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: '#424841', fontFamily: fonts.medium, fontSize: 16 },
  hint: { color: '#5D655E', fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    color: colors.text,
    minHeight: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  selector: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
  },
  selectorText: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 16 },
  multiline: { minHeight: 116, textAlignVertical: 'top' },
  summaryGrid: { gap: 24 },
  summaryCard: { borderRadius: 24, gap: 16, padding: 18 },
  definitionCard: { backgroundColor: '#FCF3E8' },
  actionCard: { backgroundColor: '#E7F1E8' },
  summaryHeader: { alignItems: 'center', flexDirection: 'row', gap: 11 },
  summaryIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 15, height: 30, justifyContent: 'center', width: 30 },
  summaryTitleWrap: { gap: 2 },
  summaryTitle: { color: '#466349', fontFamily: fonts.semibold, fontSize: 16 },
  summarySubtitle: { color: '#899588', fontFamily: fonts.medium, fontSize: 9, letterSpacing: 0.7 },
  summaryResult: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15 },
  summaryText: { color: '#303630', fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  finishButton: {
    marginTop: 8,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#466349',
    boxShadow: '0 10px 15px -3px rgba(70, 99, 73, 0.2)',
  },
  finishText: { color: colors.white, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  sheetBackground: { borderRadius: 28, backgroundColor: '#FFFEFC' },
  sheetIndicator: { backgroundColor: '#D6D0C8' },
  sheetContent: { padding: 20, paddingBottom: 34, gap: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sheetTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  sheetDoneButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  sheetDoneText: { color: colors.primary, fontFamily: fonts.semibold, fontSize: 13 },
  pressed: { opacity: 0.78 },
});
