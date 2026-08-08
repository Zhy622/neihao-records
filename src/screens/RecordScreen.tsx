import { RefObject, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  Keyboard,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { useAppAlert } from '../components/AppAlert';
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
import { AppColors, fonts, useAppTheme, useThemedStyles } from '../theme';

const levels = Array.from({ length: 10 }, (_, index) => index + 1);

function Field({
  label,
  icon,
  children,
  style,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.field, style]}>
      <View style={styles.labelRow}>
        <Ionicons name={icon} size={16} color={colors.brand} />
        <Text style={styles.label}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

function IntensityField({
  label,
  icon,
  tone,
  value,
  onChange,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'emotion' | 'decision';
  value: number;
  onChange: (value: number) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { colors } = useAppTheme();
  return (
    <View style={[styles.field, styles.intensityField]}>
      <View style={styles.intensityHeader}>
        <View style={styles.labelRow}>
          <Ionicons name={icon} size={16} color={colors.brand} />
          <Text style={styles.label}>{label}</Text>
        </View>
      </View>
      <View style={styles.levels}>
        {levels.map((level) => (
          <HapticPressable
            key={level}
            accessibilityRole="button"
            accessibilityLabel={`${label} ${level}`}
            accessibilityState={{ selected: value === level }}
            feedback="selection"
            style={({ pressed }) => [
              styles.level,
              value === level && (tone === 'emotion' ? styles.selectedEmotionLevel : styles.selectedDecisionLevel),
              pressed && styles.pressed,
            ]}
            onPress={() => onChange(level)}
          >
            <Text style={[
              styles.levelText,
              value === level && styles.selectedLevelText,
            ]}>
              {level}
            </Text>
          </HapticPressable>
        ))}
      </View>
    </View>
  );
}

export function RecordScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Record'>) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const { session } = useAuth();
  const { alert } = useAppAlert();
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
      alert('还差一点', '请写下这次纠结的事情。');
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
        alert('已保存到本机', '暂时无法同步到服务器，联网后会自动重试。', [
          { text: '知道了', onPress: () => navigation.goBack() },
        ]);
      }
    } catch {
      alert('保存失败', '记录暂时没有保存，请稍后再试。');
      setSaving(false);
    }
  };

  return (
    <Screen
      backgroundColor={colors.background}
      keyboardAvoiding
      scrollViewRef={scrollViewRef}
      contentStyle={styles.content}
    >
      <View style={styles.form}>
        <View style={styles.basicFields}>
          <Field label="这次纠结的事情 *" icon="document-text-outline">
            <TextInput
              accessibilityLabel="这次纠结的事情"
              value={title}
              onChangeText={setTitle}
              placeholder="例如：要不要接下这个任务"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
          </Field>
          <Field label="分类" icon="pricetag-outline">
            <HapticPressable
              accessibilityRole="button"
              accessibilityLabel="选择分类"
              style={styles.selector}
              onPress={() => openSelectionSheet(categorySheetRef)}
            >
              <Text style={styles.selectorText}>{category}</Text>
              <Ionicons name="chevron-down-outline" size={20} color="#466349" />
            </HapticPressable>
          </Field>
          <Field label="当时的感受 (可多选)" icon="heart-outline">
            <HapticPressable
              accessibilityRole="button"
              accessibilityLabel="选择当时的感受"
              style={styles.selector}
              onPress={() => openSelectionSheet(emotionSheetRef)}
            >
              <Text
                numberOfLines={1}
                style={[styles.selectorText, !emotions.length && styles.placeholder]}
              >
                {emotions.length ? emotions.join('、') : '选择感受'}
              </Text>
              <Ionicons name="chevron-down-outline" size={20} color="#466349" />
            </HapticPressable>
          </Field>
        </View>
        <View style={styles.intensityFields}>
          <IntensityField label="情绪强度" icon="pulse-outline" tone="emotion" value={emotionIntensity} onChange={setEmotionIntensity} />
          <IntensityField label="决策难度" icon="git-branch-outline" tone="decision" value={decisionDifficulty} onChange={setDecisionDifficulty} />
        </View>
        <Field label="耗费时间" icon="time-outline" style={styles.timeField}>
          <View style={styles.timeOptions}>
            {TIME_COSTS.map((item) => {
              const selected = timeCost === item;

              return (
                <HapticPressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  feedback="selection"
                  style={({ pressed }) => [
                    styles.timeOption,
                    selected && styles.selectedTimeOption,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setTimeCost(item)}
                >
                  <Text style={[styles.timeOptionText, selected && styles.selectedTimeOptionText]}>
                    {item}
                  </Text>
                </HapticPressable>
              );
            })}
          </View>
        </Field>
        <View style={styles.reflections}>
          <Field label="当时反复出现的想法" icon="chatbubble-ellipses-outline" style={styles.reflectionField}>
            <TextInput
              accessibilityLabel="当时反复出现的想法"
              value={thoughts}
              onChangeText={setThoughts}
              onFocus={revealBottomFields}
              placeholder="脑海里一直在想什么？"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, styles.multiline]}
              multiline
            />
          </Field>
          <Field label="最后怎么决定" icon="checkmark-done-outline" style={styles.reflectionField}>
            <TextInput
              accessibilityLabel="最后怎么决定"
              value={finalDecision}
              onChangeText={setFinalDecision}
              onFocus={revealBottomFields}
              placeholder="写下最终选择或暂时的处理方式"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, styles.multiline]}
              multiline
            />
          </Field>
        </View>
        <Field label="事后看是否值得纠结" icon="bulb-outline" style={styles.worthField}>
          <View style={styles.worthOptions}>
            {WORTH_OPTIONS.map((item) => {
              const selected = worthIt === item;

              return (
                <HapticPressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  feedback="selection"
                  style={({ pressed }) => [
                    styles.worthOption,
                    selected && styles.selectedWorthOption,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => setWorthIt(item)}
                >
                  <Text style={[styles.worthOptionText, selected && styles.selectedWorthOptionText]}>
                    {item}
                  </Text>
                </HapticPressable>
              );
            })}
          </View>
        </Field>
      </View>
      <HapticPressable
        accessibilityRole="button"
        accessibilityLabel={saving ? '保存中' : '保存记录'}
        disabled={saving}
        style={({ pressed }) => [styles.save, (pressed || saving) && styles.pressed]}
        onPress={save}
      >
        <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
        <Text style={styles.saveText}>{saving ? '保存中…' : '保存记录'}</Text>
      </HapticPressable>
      <BottomSheetModal
        ref={categorySheetRef}
        snapPoints={selectionSnapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={1} style={{ backgroundColor: colors.overlay }} />}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={styles.sheetTitle}>选择分类</Text>
          <View style={styles.sheetChips}>
            {CATEGORIES.map((item) => (
              <HapticPressable
                key={item}
                feedback="selection"
                style={({ pressed }) => [
                  styles.sheetChip,
                  category === item && styles.selectedSheetChip,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setCategory(item);
                  categorySheetRef.current?.dismiss();
                }}
              >
                <Text style={[styles.sheetChipText, category === item && styles.selectedSheetChipText]}>
                  {item}
                </Text>
              </HapticPressable>
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
      <BottomSheetModal
        ref={emotionSheetRef}
        snapPoints={selectionSnapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={1} style={{ backgroundColor: colors.overlay }} />}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={styles.sheetTitle}>选择当时的感受</Text>
          <View style={styles.sheetChips}>
            {EMOTIONS.map((item) => {
              const selected = emotions.includes(item);

              return (
                <HapticPressable
                  key={item}
                  feedback="selection"
                  style={({ pressed }) => [
                    styles.sheetChip,
                    selected && styles.selectedSheetChip,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => toggleEmotion(item)}
                >
                  <Text style={[styles.sheetChipText, selected && styles.selectedSheetChipText]}>
                    {item}
                  </Text>
                </HapticPressable>
              );
            })}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </Screen>
  );
}

const createStyles = (colors: AppColors) => ({
  content: { paddingTop: 32, paddingBottom: 40, gap: 32 },
  intro: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 16, lineHeight: 26 },
  form: { gap: 32 },
  basicFields: { gap: 16 },
  intensityFields: { gap: 16 },
  field: {
    gap: 8,
    padding: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: colors.card,
    // boxShadow: '0 1px 1px rgba(0, 0, 0, 0.05)',
  },
  label: {
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.14,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: colors.input,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 26,
  },
  selector: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: colors.input,
  },
  selectorText: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 26 },
  placeholder: { color: colors.placeholder },
  intensityField: { gap: 16 },
  intensityHeader: { flexDirection: 'row', alignItems: 'center' },
  levels: { flexDirection: 'row', gap: 4 },
  level: {
    flex: 1,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: colors.input,
  },
  selectedEmotionLevel: { backgroundColor: colors.positiveSoft },
  selectedDecisionLevel: { backgroundColor: colors.positiveSoft},
  levelText: { color: colors.placeholder, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  selectedLevelText: { color: colors.brand },
  timeField: { gap: 16 },
  timeOptions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 10 },
  timeOption: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: colors.input,

  },
  selectedTimeOption: {
    height: 38,
    backgroundColor: colors.positiveSoft,
  },
  timeOptionText: { color: colors.text, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  selectedTimeOptionText: { color: colors.brand },
  reflections: { gap: 16 },
  reflectionField: { paddingBottom: 22 },
  multiline: { height: 102, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' },
  worthField: { gap: 16 },
  worthOptions: {
    height: 52,
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: colors.input,
  },
  worthOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  selectedWorthOption: { backgroundColor: colors.card, boxShadow: `0 1px 1px ${colors.shadow}` },
  worthOptionText: { color: colors.placeholder, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  selectedWorthOptionText: { color: colors.brand },
  save: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 32,
    backgroundColor: colors.brand,
    boxShadow: '0 10px 15px -3px rgba(70, 99, 73, 0.2)',
  },
  saveText: { color: colors.buttonForeground, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20 },
  sheetBackground: { borderRadius: 28, backgroundColor: colors.card },
  sheetIndicator: { backgroundColor: colors.border },
  sheetContent: { padding: 20, paddingBottom: 34, gap: 16 },
  sheetTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  sheetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sheetChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E3E1DA',
    backgroundColor: colors.cardSecondary,
  },
  selectedSheetChip: { backgroundColor: colors.positiveSoft, borderColor: colors.positiveSoft },
  sheetChipText: { color: colors.placeholder, fontFamily: fonts.medium, fontSize: 14 },
  selectedSheetChipText: { color: colors.positive, fontFamily: fonts.semibold },
  pressed: { opacity: 0.75 },
});
