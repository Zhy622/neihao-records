import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { HapticPressable } from '../components/HapticPressable';
import { useAppAlert } from '../components/AppAlert';
import { NoteScrollbar, useNoteScrollbar } from '../components/NoteScrollbar';
import { createNote } from '../database/database';
import { NOTE_CATEGORIES, NOTE_EMOTIONS, NOTE_TYPES, NoteCategory, NoteEmotion, NoteType } from '../types/note';
import { RootStackParamList } from '../types/navigation';
import { AppColors, fonts, useAppTheme, useThemedStyles } from '../theme';

type NoteDraft = {
  content: string;
  noteType: NoteType;
  emotions: NoteEmotion[];
  categories: NoteCategory[];
};

const emptyDraft: NoteDraft = {
  content: '',
  noteType: '暂不分类',
  emotions: [],
  categories: [],
};

// ponytail: in-memory draft until Notes persistence exists.
let draft: NoteDraft = emptyDraft;

function OptionPill({
  label,
  selected,
  tone,
  onPress,
}: {
  label: string;
  selected: boolean;
  tone: 'emotion' | 'type' | 'category';
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const selectedPillStyles = { emotion: styles.emotionSelected, type: styles.typeSelected, category: styles.categorySelected };
  const selectedTextStyles = { emotion: styles.emotionTextSelected, type: styles.typeTextSelected, category: styles.categoryTextSelected };
  return (
    <HapticPressable
      feedback="selection"
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionPill,
        selected && selectedPillStyles[tone],
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.optionText, selected && selectedTextStyles[tone]]}>{label}</Text>
    </HapticPressable>
  );
}

function toggleItem<T>(items: T[], item: T) {
  return items.includes(item) ? items.filter((current) => current !== item) : [...items, item];
}

export function NoteEditorScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();
  const { alert } = useAppAlert();
  const headerHeight = useHeaderHeight();
  const bottomTabBarHeight = useBottomTabBarHeight();
  const organizeSheetRef = useRef<BottomSheetModal>(null);
  const sheetSnapPoints = useMemo(() => ['78%'], []);
  const [content, setContent] = useState(draft.content);
  const [noteType, setNoteType] = useState<NoteType>(draft.noteType);
  const [emotions, setEmotions] = useState<NoteEmotion[]>(draft.emotions);
  const [categories, setCategories] = useState<NoteCategory[]>(draft.categories);
  const [saving, setSaving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollbar = useNoteScrollbar();

  const hasDraft = useMemo(
    () => Boolean(content.trim() || emotions.length || categories.length || noteType !== '暂不分类'),
    [categories.length, content, emotions.length, noteType],
  );

  useEffect(() => {
    draft = { content, noteType, emotions, categories };
  }, [categories, content, emotions, noteType]);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const openOrganizeSheet = () => {
    if (!content.trim()) {
      alert('还差一点', '请先写下此刻的想法、感受或事情。');
      return;
    }

    Keyboard.dismiss();
    setTimeout(() => organizeSheetRef.current?.present(), 120);
  };

  const save = async () => {
    if (!session) {
      return;
    }

    try {
      setSaving(true);
      const note = await createNote(db, session.user.id, { content, noteType, emotions, categories });
      if (!note) {
        throw new Error('Local note was not created.');
      }

      draft = emptyDraft;
      setContent('');
      setNoteType('暂不分类');
      setEmotions([]);
      setCategories([]);
      organizeSheetRef.current?.dismiss();
      navigation.navigate('NoteHistory');
    } catch {
      alert('保存失败', '随记暂时没有保存，请稍后再试。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <View style={styles.editorContainer}>
          <View style={styles.notebook}>
            <View style={styles.notebookTab}>
              <View style={styles.notebookTabMark} />
            </View>

            <View style={styles.contentCard}>
              <TextInput
                accessibilityLabel="写下此刻"
                multiline
                scrollEnabled
                value={content}
                onChangeText={setContent}
                onContentSizeChange={scrollbar.onContentSizeChange}
                onLayout={scrollbar.onLayout}
                onScroll={scrollbar.onScroll}
                placeholder="此刻你在想什么？刚刚做了什么？什么让你感到开心、压抑、投入或抗拒？"
                placeholderTextColor={colors.placeholder}
                style={styles.contentInput}
                textAlignVertical="top"
              />
              <NoteScrollbar scrollbar={scrollbar} />
            </View>

          </View>
        </View>

        <View style={[styles.toolbar, { marginBottom: keyboardVisible ? 0 : bottomTabBarHeight + 20 }]}>
          <HapticPressable accessibilityRole="button" style={({ pressed }) => [styles.save, pressed && styles.pressed]} onPress={openOrganizeSheet}>
            <Ionicons name="sparkles" size={20} color={colors.buttonForeground} />
            <Text style={styles.saveText}>{hasDraft ? '保存随记' : '写下此刻'}</Text>
          </HapticPressable>
        </View>
      </KeyboardAvoidingView>

      <BottomSheetModal
        ref={organizeSheetRef}
        snapPoints={sheetSnapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={1} style={{ backgroundColor: colors.overlay }} />}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          <Text style={styles.sheetTitle}>整理一下这条随记</Text>
          <Text style={styles.sheetHint}>不用想太重，按此刻的感觉轻轻标一下。</Text>

          <View style={styles.sheetSection}>
            <Text style={styles.sheetLabel}>当前感受</Text>
            <View style={styles.chips}>
              {NOTE_EMOTIONS.map((emotion) => (
                <OptionPill
                  key={emotion}
                  label={emotion}
                  tone="emotion"
                  selected={emotions.includes(emotion)}
                  onPress={() => setEmotions((current) => toggleItem(current, emotion))}
                />
              ))}
            </View>
          </View>

          <View style={styles.sheetSection}>
            <Text style={styles.sheetLabel}>记录类型</Text>
            <View style={styles.chips}>
              {NOTE_TYPES.map((type) => (
                <OptionPill
                  key={type}
                  label={type}
                  tone="type"
                  selected={noteType === type}
                  onPress={() => setNoteType(type)}
                />
              ))}
            </View>
          </View>

          <View style={styles.sheetSection}>
            <Text style={styles.sheetLabel}>初步判断</Text>
            <View style={styles.chips}>
              {NOTE_CATEGORIES.map((category) => (
                <OptionPill
                  key={category}
                  label={category}
                  tone="category"
                  selected={categories.includes(category)}
                  onPress={() => setCategories((current) => toggleItem(current, category))}
                />
              ))}
            </View>
          </View>

          <HapticPressable disabled={saving} style={({ pressed }) => [styles.confirmButton, (pressed || saving) && styles.pressed]} onPress={save}>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.buttonForeground} />
            <Text style={styles.confirmText}>{saving ? '保存中...' : '确定并保存'}</Text>
          </HapticPressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  keyboardContainer: { flex: 1 },
  editorContainer: { flex: 1, minHeight: 0, paddingHorizontal: 30 },
  notebook: { flex: 1, minHeight: 0, paddingTop: 26 },
  notebookTab: {
    width: 86,
    height: 32,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.brand,
  },
  notebookTabMark: { width: 35, height: 10, borderRadius: 999, backgroundColor: colors.background },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  contentCard: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.card,
  },
  contentInput: {
    flex: 1,
    minHeight: 0,
    paddingLeft: 26,
    paddingRight: 42,
    paddingTop: 30,
    paddingBottom: 24,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 24,
    letterSpacing:0.3,
    textAlignVertical: 'top',
  },
  toolbar: { marginTop: 28, paddingHorizontal: 22 },
  save: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.brand,
  },
  saveText: { color: colors.buttonForeground, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  sheetBackground: { borderRadius: 28, backgroundColor: colors.card },
  sheetIndicator: { backgroundColor: colors.border },
  sheetContent: { padding: 20, paddingBottom: 34, gap: 18 },
  sheetTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  sheetHint: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  sheetSection: { gap: 10 },
  sheetLabel: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  optionPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.cardSecondary,
  },
  optionText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 14 },
  emotionSelected: { backgroundColor: colors.positiveSoft },
  emotionTextSelected: { color: colors.positive, fontFamily: fonts.semibold },
  typeSelected: { backgroundColor: colors.purpleSoft },
  typeTextSelected: { color: colors.purple, fontFamily: fonts.semibold },
  categorySelected: { backgroundColor: colors.warmSoft },
  categoryTextSelected: { color: colors.warm, fontFamily: fonts.semibold },
  confirmButton: {
    marginTop: 4,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.brand,
  },
  confirmText: { color: colors.buttonForeground, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  pressed: { opacity: 0.78 },
});

