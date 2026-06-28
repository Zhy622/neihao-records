import { RefObject, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Alert, Keyboard, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { Chip } from '../components/Chip';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { createRecord } from '../database/database';
import {
  CATEGORIES,
  Category,
  EMOTIONS,
  Emotion,
  TIME_COSTS,
  TimeCost,
  WORTH_OPTIONS,
  WorthIt,
} from '../types/record';
import { RootStackParamList } from '../types/navigation';
import { syncRecordById } from '../sync/records-sync';
import { colors, fonts } from '../theme';

const levels = Array.from({ length: 10 }, (_, index) => index + 1);

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

export function RecordScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Record'>) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const categorySheetRef = useRef<BottomSheetModal>(null);
  const emotionSheetRef = useRef<BottomSheetModal>(null);
  const selectionSnapPoints = useMemo(() => ['48%'], []);
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

  const toggleEmotion = (emotion: Emotion) => {
    setEmotions((current) =>
      current.includes(emotion) ? current.filter((item) => item !== emotion) : [...current, emotion],
    );
  };

  const revealBottomFields = () => {
    // Wait until the keyboard has resized the Android window before scrolling.
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
  };

  const openSelectionSheet = (sheetRef: RefObject<BottomSheetModal | null>) => {
    Keyboard.dismiss();
    setTimeout(() => sheetRef.current?.present(), 120);
  };

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('还差一点', '请写下这次纠结的事情。');
      return;
    }
    try {
      setSaving(true);
      const localRecord = await createRecord(db, session!.user.id, {
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

      if (!localRecord) {
        throw new Error('Local record was not created.');
      }

      let synced = false;
      try {
        synced = await syncRecordById(db, session!.user.id, localRecord.id);
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
      Alert.alert('保存失败', '记录暂时没有保存，请稍后再试。');
      setSaving(false);
    }
  };

  return (
    <Screen keyboardAvoiding scrollViewRef={scrollViewRef} contentStyle={styles.content}>
      <Field label="这次纠结的事情 *">
        <TextInput value={title} onChangeText={setTitle} placeholder="例如：要不要接下这个任务" placeholderTextColor={colors.muted} style={styles.input} />
      </Field>
      <Field label="分类">
        <HapticPressable style={styles.selector} onPress={() => openSelectionSheet(categorySheetRef)}>
          <Text style={styles.selectorText}>{category}</Text>
          <Ionicons name="chevron-down-outline" size={18} color={colors.primary} />
        </HapticPressable>
      </Field>
      <Field label="当时的感受" hint="可以多选">
        <HapticPressable style={styles.selector} onPress={() => openSelectionSheet(emotionSheetRef)}>
          <Text style={styles.selectorText}>{emotions.length ? emotions.join('、') : '选择感受'}</Text>
          <Ionicons name="chevron-down-outline" size={18} color={colors.primary} />
        </HapticPressable>
      </Field>
      <Field label={`情绪强度 · ${emotionIntensity}/10`}><View style={styles.chips}>{levels.map((level) => <Chip key={level} label={String(level)} selected={emotionIntensity === level} onPress={() => setEmotionIntensity(level)} />)}</View></Field>
      <Field label={`决策难度 · ${decisionDifficulty}/10`}><View style={styles.chips}>{levels.map((level) => <Chip key={level} label={String(level)} selected={decisionDifficulty === level} onPress={() => setDecisionDifficulty(level)} />)}</View></Field>
      <Field label="耗费时间"><View style={styles.chips}>{TIME_COSTS.map((item) => <Chip key={item} label={item} selected={timeCost === item} onPress={() => setTimeCost(item)} />)}</View></Field>
      <Field label="当时反复出现的想法"><TextInput value={thoughts} onChangeText={setThoughts} onFocus={revealBottomFields} placeholder="脑海里一直在想什么？" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline /></Field>
      <Field label="最后怎么决定"><TextInput value={finalDecision} onChangeText={setFinalDecision} onFocus={revealBottomFields} placeholder="写下最终选择或暂时的处理方式" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline /></Field>
      <Field label="事后看是否值得纠结"><View style={styles.chips}>{WORTH_OPTIONS.map((item) => <Chip key={item} label={item} selected={worthIt === item} onPress={() => setWorthIt(item)} />)}</View></Field>
      <HapticPressable disabled={saving} style={({ pressed }) => [styles.save, (pressed || saving) && styles.pressed]} onPress={save}>
        <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
        <Text style={styles.saveText}>{saving ? '保存中…' : '保存记录'}</Text>
      </HapticPressable>
      <BottomSheetModal
        ref={categorySheetRef}
        snapPoints={selectionSnapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.18} />}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={styles.sheetTitle}>选择分类</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((item) => (
              <Chip
                key={item}
                label={item}
                selected={category === item}
                onPress={() => {
                  setCategory(item);
                  categorySheetRef.current?.dismiss();
                }}
              />
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
      <BottomSheetModal
        ref={emotionSheetRef}
        snapPoints={selectionSnapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.18} />}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={styles.sheetTitle}>选择当时的感受</Text>
          <View style={styles.chips}>
            {EMOTIONS.map((item) => <Chip key={item} label={item} selected={emotions.includes(item)} onPress={() => toggleEmotion(item)} />)}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  field: { gap: 9 },
  label: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  hint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 13, fontFamily: fonts.regular, fontSize: 15 },
  selector: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  selectorText: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 15 },
  multiline: { minHeight: 92, textAlignVertical: 'top' },
  save: { backgroundColor: colors.primary, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, padding: 16, marginTop: 8 },
  saveText: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
  sheetBackground: { borderRadius: 28, backgroundColor: '#FFFEFC' },
  sheetIndicator: { backgroundColor: '#D6D0C8' },
  sheetContent: { padding: 20, paddingBottom: 34, gap: 16 },
  sheetTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  pressed: { opacity: 0.75 },
});
