import { useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { useAppAlert } from '../components/AppAlert';
import { createNote } from '../database/database';
import { NOTE_CATEGORIES, NOTE_EMOTIONS, NOTE_TYPES, NoteCategory, NoteEmotion, NoteType } from '../types/note';
import { RootStackParamList } from '../types/navigation';
import { colors, fonts } from '../theme';

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
const contentInputMinHeight = 414;
const keyboardClearance = 64;

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
  const db = useSQLiteContext();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();
  const { alert } = useAppAlert();
  const scrollViewRef = useRef<ScrollView>(null);
  const contentInputRef = useRef<TextInput>(null);
  const scrollOffset = useRef(0);
  const contentInputFocused = useRef(false);
  const contentLength = useRef(draft.content.length);
  const cursorAtEnd = useRef(false);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const organizeSheetRef = useRef<BottomSheetModal>(null);
  const sheetSnapPoints = useMemo(() => ['78%'], []);
  const [content, setContent] = useState(draft.content);
  const [noteType, setNoteType] = useState<NoteType>(draft.noteType);
  const [emotions, setEmotions] = useState<NoteEmotion[]>(draft.emotions);
  const [categories, setCategories] = useState<NoteCategory[]>(draft.categories);
  const [saving, setSaving] = useState(false);

  const hasDraft = useMemo(
    () => Boolean(content.trim() || emotions.length || categories.length || noteType !== '暂不分类'),
    [categories.length, content, emotions.length, noteType],
  );

  useEffect(() => {
    draft = { content, noteType, emotions, categories };
  }, [categories, content, emotions, noteType]);

  const keepContentInputVisible = () => {
    const keyboard = Keyboard.metrics();
    const input = contentInputRef.current;
    if (!keyboard || !input || !contentInputFocused.current || !cursorAtEnd.current) {
      return;
    }

    input.measureInWindow((_, y, __, height) => {
      const overlap = y + height - keyboard.screenY + keyboardClearance;
      if (overlap <= 0) {
        return;
      }

      const nextOffset = scrollOffset.current + overlap;
      scrollOffset.current = nextOffset;
      scrollViewRef.current?.scrollTo({ y: nextOffset, animated: true });
    });
  };

  const requestContentInputReveal = (delay = 32) => {
    if (revealTimer.current) {
      clearTimeout(revealTimer.current);
    }
    revealTimer.current = setTimeout(() => {
      revealTimer.current = null;
      keepContentInputVisible();
    }, delay);
  };

  const trackScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.current = event.nativeEvent.contentOffset.y;
  };

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', () => requestContentInputReveal());
    return () => {
      subscription.remove();
      if (revealTimer.current) {
        clearTimeout(revealTimer.current);
      }
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
    <Screen
      backgroundColor="#F7FAF8"
      keyboardAvoiding
      keyboardAvoidingMode="fullscreen"
      onScroll={trackScroll}
      scrollViewRef={scrollViewRef}
      contentStyle={styles.content}
    >
      <View style={styles.notebook}>
        <View style={styles.notebookTab}>
          <View style={styles.notebookTabMark} />
        </View>
        <TextInput
          ref={contentInputRef}
          accessibilityLabel="写下此刻"
          multiline
          value={content}
          onChangeText={(nextContent) => {
            contentLength.current = nextContent.length;
            setContent(nextContent);
          }}
          onFocus={() => {
            contentInputFocused.current = true;
            requestContentInputReveal(300);
          }}
          onBlur={() => { contentInputFocused.current = false; }}
          onSelectionChange={({ nativeEvent: { selection } }) => {
            cursorAtEnd.current = selection.start === selection.end && selection.end === contentLength.current;
            if (cursorAtEnd.current) {
              requestContentInputReveal();
            }
          }}
          onContentSizeChange={() => Keyboard.isVisible() && requestContentInputReveal()}
          placeholder="此刻你在想什么？刚刚做了什么？什么让你感到开心、压抑、投入或抗拒？"
          placeholderTextColor="rgba(66, 72, 65, 0.48)"
          style={styles.contentInput}
          textAlignVertical="top"
        />
      </View>

      <HapticPressable accessibilityRole="button" style={({ pressed }) => [styles.save, pressed && styles.pressed]} onPress={openOrganizeSheet}>
        <Ionicons name="sparkles" size={20} color={colors.white} />
        <Text style={styles.saveText}>{hasDraft ? '保存随记' : '写下此刻'}</Text>
      </HapticPressable>

      <BottomSheetModal
        ref={organizeSheetRef}
        snapPoints={sheetSnapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.18} />}
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
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
            <Text style={styles.confirmText}>{saving ? '保存中...' : '确定并保存'}</Text>
          </HapticPressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 0, paddingHorizontal: 30, paddingBottom: 130, gap: 48 },
  notebook: { paddingTop: 32 },
  notebookTab: {
    width: 80,
    height: 32,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#618065',
  },
  notebookTabMark: { width: 35, height: 10, borderRadius: 999, backgroundColor: '#F7FAF8' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  contentInput: {
    minHeight: contentInputMinHeight,
    paddingHorizontal: 40,
    paddingTop: 48,
    paddingBottom: 24,
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#5F8064',
    backgroundColor: '#FFFCFA',
    color: '#181C1C',
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 32,
    textAlignVertical: 'top',
  },
  save: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#466349',
  },
  saveText: { color: colors.white, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  sheetBackground: { borderRadius: 28, backgroundColor: '#FFFEFC' },
  sheetIndicator: { backgroundColor: '#D6D0C8' },
  sheetContent: { padding: 20, paddingBottom: 34, gap: 18 },
  sheetTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  sheetHint: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  sheetSection: { gap: 10 },
  sheetLabel: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  optionPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.surface,
  },
  optionText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14 },
  emotionSelected: { backgroundColor: '#EEF6EF' },
  emotionTextSelected: { color: '#597563', fontFamily: fonts.semibold },
  typeSelected: { backgroundColor: '#F3F0FA' },
  typeTextSelected: { color: '#665B7C', fontFamily: fonts.semibold },
  categorySelected: { backgroundColor: '#F7EFE7' },
  categoryTextSelected: { color: '#8A6D58', fontFamily: fonts.semibold },
  confirmButton: {
    marginTop: 4,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#466349',
  },
  confirmText: { color: colors.white, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  pressed: { opacity: 0.78 },
});

const selectedPillStyles = {
  emotion: styles.emotionSelected,
  type: styles.typeSelected,
  category: styles.categorySelected,
};

const selectedTextStyles = {
  emotion: styles.emotionTextSelected,
  type: styles.typeTextSelected,
  category: styles.categoryTextSelected,
};
