import { useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Alert, Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { Chip } from '../components/Chip';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { SoftCard } from '../components/SoftCard';
import { createPeopleObservation } from '../database/database';
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
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
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

export function PeopleObservationScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'PeopleObservation'>) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
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

  const revealInputArea = (y: number) => {
    setTimeout(() => scrollViewRef.current?.scrollTo({ y, animated: true }), 260);
  };

  const finishObservation = async () => {
    if (!alias.trim()) {
      Alert.alert('还差一点', '请先写下这个人的代号。');
      return;
    }
    if (!selectedEmotions.length) {
      Alert.alert('还差一点', '请选择至少一种主要情绪。');
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

      setSaving(false);
      if (synced) {
        navigation.goBack();
      } else {
        Alert.alert('已保存到本机', '暂时无法同步到服务器，联网后会自动重试。', [
          { text: '知道了', onPress: () => navigation.goBack() },
        ]);
      }
    } catch {
      Alert.alert('保存失败', '人物观照暂时没有保存，请稍后再试。');
      setSaving(false);
    }
  };

  return (
    <Screen
      keyboardAvoiding
      keyboardAvoidingMode="fullscreen"
      scrollViewRef={scrollViewRef}
      contentStyle={styles.content}
    >
      <Field label="人物代号" hint="可以是昵称、角色名或只有你看得懂的代号。">
        <TextInput
          value={alias}
          onChangeText={setAlias}
          placeholder="例如：A 同事 / 那位朋友 / 高中同学"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </Field>

      <Field label="我对 TA 的主要情绪" hint="可以多选，复杂一点也没关系。">
        <HapticPressable style={styles.selector} onPress={openEmotionSheet}>
          <Text numberOfLines={1} style={styles.selectorText}>
            {selectedEmotions.length ? selectedEmotions.join('、') : '选择主要情绪'}
          </Text>
          <Ionicons name="chevron-down-outline" size={18} color={colors.primary} />
        </HapticPressable>
      </Field>

      <Field label="触发场景">
        <TextInput
          value={triggerScene}
          onChangeText={setTriggerScene}
          placeholder="我是在什么情况下想到 TA 的？"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.multiline]}
          multiline
        />
      </Field>

      <Field label="我轻蔑 TA 的点" hint="可以诚实一点写，先不急着评判自己。">
        <TextInput
          value={contemptPoints}
          onChangeText={setContemptPoints}
          onFocus={() => revealInputArea(260)}
          placeholder="我看不上的地方是什么？"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.multiline]}
          multiline
        />
      </Field>

      <Field label="我自卑或羡慕 TA 的点">
        <TextInput
          value={admirePoints}
          onChangeText={setAdmirePoints}
          onFocus={() => revealInputArea(380)}
          placeholder="TA 的什么地方让我不舒服、羡慕或不服气？"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.multiline]}
          multiline
        />
      </Field>

      <Field label="TA 比我强的具体能力">
        <TextInput
          value={otherStrengths}
          onChangeText={setOtherStrengths}
          onFocus={() => revealInputArea(540)}
          placeholder="例如：表达更直接、执行更快、更会争取资源"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.multiline]}
          multiline
        />
      </Field>

      <Field label="我比 TA 强或不弱的地方">
        <TextInput
          value={myStrengths}
          onChangeText={setMyStrengths}
          onFocus={() => revealInputArea(660)}
          placeholder="例如：更稳定、更细致、更愿意复盘"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.multiline]}
          multiline
        />
      </Field>

      <View style={styles.summaryGrid}>
        <SoftCard colors={['#FFFEFC', '#F3F0FA']} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
            <Text style={styles.summaryTitle}>重新定义这个人</Text>
          </View>
          <Text style={styles.summaryText}>{personDefinition}</Text>
        </SoftCard>

        <SoftCard colors={['#FFFEFC', '#EEF6EF']} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="walk-outline" size={18} color={colors.primary} />
            <Text style={styles.summaryTitle}>我可以学习的一个行动</Text>
          </View>
          <Text style={styles.summaryText}>{learningAction}</Text>
        </SoftCard>
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
  content: { paddingBottom: 150 },
  field: { gap: 9 },
  label: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  hint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
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
  selector: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectorText: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 15 },
  multiline: { minHeight: 92, textAlignVertical: 'top' },
  summaryGrid: { gap: 12 },
  summaryCard: { gap: 10, padding: 16 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  summaryTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 15 },
  summaryText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 22 },
  finishButton: {
    marginTop: 4,
    padding: 15,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.primary,
  },
  finishText: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
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
