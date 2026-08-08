import { useCallback, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useFocusEffect } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { useAppAlert } from '../components/AppAlert';
import { HapticPressable } from '../components/HapticPressable';
import { NoteScrollbar, useNoteScrollbar } from '../components/NoteScrollbar';
import { Screen } from '../components/Screen';
import { getNote, updateNote } from '../database/database';
import { deleteAndSyncNote, syncNoteById } from '../sync/notes-sync';
import { NOTE_CATEGORIES, NOTE_EMOTIONS, NOTE_TYPES, Note, NoteCategory, NoteEmotion, NoteType } from '../types/note';
import { RootStackParamList } from '../types/navigation';
import { AppColors, fonts, useAppTheme, useThemedStyles } from '../theme';

function toggleItem<T>(items: T[], item: T) {
  return items.includes(item) ? items.filter((current) => current !== item) : [...items, item];
}

function Pill({
  label,
  selected,
  tone,
  onPress,
}: {
  label: string;
  selected?: boolean;
  tone: 'type' | 'emotion' | 'category';
  onPress?: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const palette = pillTones[tone];

  return (
    <HapticPressable
      feedback="selection"
      onPress={onPress}
      style={({ pressed }) => [styles.pill, palette.background, selected && palette.selectedBackground, pressed && styles.pressed]}
    >
      <Text style={[styles.pillText, palette.text, selected && palette.selectedText]}>{label}</Text>
    </HapticPressable>
  );
}

export function NoteDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'NoteDetail'>) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const db = useSQLiteContext();
  const { session } = useAuth();
  const { alert } = useAppAlert();
  const headerHeight = useHeaderHeight();
  const organizeSheetRef = useRef<BottomSheetModal>(null);
  const sheetSnapPoints = useMemo(() => ['78%'], []);
  const [note, setNote] = useState<Note | null>(null);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('暂不分类');
  const [emotions, setEmotions] = useState<NoteEmotion[]>([]);
  const [categories, setCategories] = useState<NoteCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const scrollbar = useNoteScrollbar();

  const applyNote = useCallback((nextNote: Note | null) => {
    setNote(nextNote);
    if (!nextNote) {
      return;
    }

    setContent(nextNote.content);
    setNoteType(nextNote.noteType);
    setEmotions(nextNote.emotions);
    setCategories(nextNote.categories);
  }, []);

  const loadNote = useCallback(async () => {
    if (!session) {
      return;
    }

    const nextNote = await getNote(db, session.user.id, route.params.id);
    applyNote(nextNote);
    if (!nextNote) {
      navigation.goBack();
    }
  }, [applyNote, db, navigation, route.params.id, session]);

  useFocusEffect(useCallback(() => { void loadNote(); }, [loadNote]));

  const save = async () => {
    if (!session || !note) {
      return;
    }
    if (!content.trim()) {
      alert('还差一点', '随记正文不能为空。');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateNote(db, session.user.id, note.id, {
        content,
        noteType,
        emotions,
        categories,
      });
      if (!updated) {
        throw new Error('Note was not updated.');
      }
      applyNote(updated);
      let synced = false;
      try {
        synced = await syncNoteById(db, session.user.id, updated.id);
      } catch {
        synced = false;
      }
      setEditing(false);
      if (!synced) {
        alert('已保存到本机', '暂时无法同步到服务器，联网后会自动重试。');
      }
    } catch {
      alert('保存失败', '随记暂时没有保存，请稍后再试。');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!session || !note) {
      return;
    }

    alert('删除随记', '确定删除这条随记吗？删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const synced = await deleteAndSyncNote(db, session.user.id, note.id);
          if (!synced) {
            alert('已从本机移除', '服务器删除会在联网后自动重试。');
          }
          navigation.popTo('NoteHistory', { deletedId: note.id });
        },
      },
    ]);
  };

  if (!note) {
    return null;
  }

  if (editing) {
    return (
      <SafeAreaView style={styles.editSafe} edges={[]}>
        <KeyboardAvoidingView
          style={styles.editKeyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
        >
          <View style={styles.editPage}>
            <View style={styles.editCard}>
              <View style={styles.cardHeader}>
                <Text selectable style={styles.meta}>{new Date(note.createdAt).toLocaleString('zh-CN', { hour12: false })}</Text>
                <View style={styles.divider} />
              </View>
              <View style={styles.editInputContainer}>
                <TextInput
                  autoFocus
                  accessibilityLabel="编辑随记正文"
                  multiline
                  scrollEnabled
                  value={content}
                  onChangeText={setContent}
                  onContentSizeChange={scrollbar.onContentSizeChange}
                  onLayout={scrollbar.onLayout}
                  onScroll={scrollbar.onScroll}
                  placeholder="写下此刻..."
                  placeholderTextColor={colors.placeholder}
                  style={styles.editInput}
                  textAlignVertical="top"
                />
                <NoteScrollbar scrollbar={scrollbar} right={-18} />
              </View>
            </View>

            <HapticPressable
              accessibilityRole="button"
              accessibilityLabel="整理随记标签"
              feedback="selection"
              style={({ pressed }) => [styles.organizeButton, pressed && styles.pressed]}
              onPress={() => {
                Keyboard.dismiss();
                organizeSheetRef.current?.present();
              }}
            >
              <Ionicons name="options-outline" size={18} color={colors.brand} />
              <Text style={styles.organizeText}>整理标签</Text>
            </HapticPressable>

            <View style={[styles.actions,{ marginBottom:30}]}>
              <HapticPressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => { applyNote(note); setEditing(false); }}>
                <Text style={styles.secondaryText}>取消</Text>
              </HapticPressable>
              <HapticPressable disabled={saving} style={({ pressed }) => [styles.primaryButton, (pressed || saving) && styles.pressed]} onPress={save}>
                <Text style={styles.primaryText}>{saving ? '保存中...' : '保存修改'}</Text>
              </HapticPressable>
            </View>
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
            <Text style={styles.sheetTitle}>整理这条随记</Text>
            <View style={styles.editorSections}>
              <View style={styles.section}>
                <Text style={styles.label}>记录类型</Text>
                <View style={styles.chips}>
                  {NOTE_TYPES.map((type) => <Pill key={type} label={type} tone="type" selected={noteType === type} onPress={() => setNoteType(type)} />)}
                </View>
              </View>
              <View style={styles.section}>
                <Text style={styles.label}>当前感受</Text>
                <View style={styles.chips}>
                  {NOTE_EMOTIONS.map((emotion) => <Pill key={emotion} label={emotion} tone="emotion" selected={emotions.includes(emotion)} onPress={() => setEmotions((current) => toggleItem(current, emotion))} />)}
                </View>
              </View>
              <View style={styles.section}>
                <Text style={styles.label}>初步判断</Text>
                <View style={styles.chips}>
                  {NOTE_CATEGORIES.map((category) => <Pill key={category} label={category} tone="category" selected={categories.includes(category)} onPress={() => setCategories((current) => toggleItem(current, category))} />)}
                </View>
              </View>
            </View>
          </BottomSheetScrollView>
        </BottomSheetModal>
      </SafeAreaView>
    );
  }

  return (
    <Screen backgroundColor={colors.background} keyboardAvoiding keyboardAvoidingMode="fullscreen" contentStyle={styles.content}>
      <View style={styles.card}>
        <View pointerEvents="none" style={styles.cardAccent} />
        <View style={styles.cardHeader}>
          <Text selectable style={styles.meta}>{new Date(note.createdAt).toLocaleString('zh-CN', { hour12: false })}</Text>
          <View style={styles.divider} />
        </View>
        <Text selectable style={styles.noteText}>{note.content}</Text>
        {note.updatedAt !== note.createdAt ? <Text selectable style={styles.updatedMeta}>更新于 {new Date(note.updatedAt).toLocaleString('zh-CN', { hour12: false })}</Text> : null}
        <View style={styles.cardFooter}>
          <View style={styles.footerDot} />
          <Text style={styles.footerText}>Journal Entry Details</Text>
        </View>
      </View>

      <View style={styles.chips}>
        <Text style={[styles.tag, styles.typeTag]}>{note.noteType}</Text>
        {note.emotions.map((tag) => <Text key={tag} style={[styles.tag, styles.emotionTag]}>{tag}</Text>)}
        {note.categories.map((tag) => <Text key={tag} style={[styles.tag, styles.categoryTag]}>{tag}</Text>)}
      </View>

      <View style={styles.actions}>
        <HapticPressable style={({ pressed }) => [styles.secondaryButton, styles.editButton, pressed && styles.pressed]} onPress={() => setEditing(true)}>
          <Ionicons name="create-outline" size={18} color={colors.buttonForeground} />
          <Text style={[styles.secondaryText, styles.editText]}>编辑</Text>
        </HapticPressable>
        <HapticPressable style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]} onPress={remove}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
          <Text style={styles.dangerText}>删除</Text>
        </HapticPressable>
      </View>
    </Screen>
  );
}

const createStyles = (colors: AppColors) => ({
  content: { paddingTop: 20, paddingHorizontal: 30, paddingBottom: 130, gap: 32 },
  editSafe: { flex: 1, backgroundColor: colors.background },
  editKeyboardContainer: { flex: 1 },
  editPage: { flex: 1, minHeight: 0, gap: 16, paddingHorizontal: 30, paddingTop: 20, paddingBottom: 20 },
  editCard: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 30,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: colors.card,
    boxShadow: '0 12px 24px -12px rgba(70, 99, 73, 0.08)',
  },
  card: {
    minHeight: 424,
    overflow: 'hidden',
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 30,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: colors.card,
    boxShadow: '0 12px 24px -12px rgba(70, 99, 73, 0.08)',
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: colors.positiveSoft },
  cardHeader: { gap: 9 },
  divider: { height: 1, backgroundColor: colors.border },
  noteText: { marginTop: 24,marginBottom: 24, color: colors.text, fontFamily: fonts.regular, fontSize: 15, lineHeight: 26 },
  editInputContainer: { flex: 1, minHeight: 0, position: 'relative', marginTop: 20 },
  editInput: {
    flex: 1,
    minHeight: 0,
    marginBottom: 0,
    padding: 0,
    paddingRight: 6,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    letterSpacing:0.3,
    lineHeight: 24,
  },
  meta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  updatedMeta: { marginTop: 8, color: colors.placeholder, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  cardFooter: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8FAF93' },
  footerText: { color: '#ABB0AB', fontFamily: fonts.regular, fontSize: 12, letterSpacing: 0.2 },
  section: { gap: 10 },
  editorSections: { gap: 20 },
  organizeButton: { height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderRadius: 24, backgroundColor: colors.brandSoft },
  organizeText: { color: colors.brand, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  sheetBackground: { borderRadius: 28, backgroundColor: colors.card },
  sheetIndicator: { backgroundColor: colors.border },
  sheetContent: { padding: 20, paddingBottom: 34, gap: 18 },
  sheetTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  label: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tag: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  typeTag: { backgroundColor: colors.cardSecondary },
  emotionTag: { backgroundColor: colors.warmSoft },
  categoryTag: { backgroundColor: colors.positiveSoft },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 16},
  primaryButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: colors.brand,
  },
  primaryText: { color: colors.buttonForeground, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  secondaryButton: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: colors.cardSecondary,
  },
  secondaryText: { color: colors.textSecondary, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  editButton: { backgroundColor: colors.brand },
  editText: { color: colors.buttonForeground },
  dangerButton: {
    flex: 1,
    height: 52,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: colors.cardSecondary,
  },
  dangerText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  pressed: { opacity: 0.78 },
});

const pillTones = {
  type: {
    background: { backgroundColor: '#F3F4F2' },
    selectedBackground: { backgroundColor: '#DDE5DE' },
    text: { color: '#5E655E' },
    selectedText: { color: '#466349', fontFamily: fonts.medium },
  },
  emotion: {
    background: { backgroundColor: '#FFFFFF' },
    selectedBackground: { backgroundColor: '#FFDDBE' },
    text: { color: '#5E655E' },
    selectedText: { color: '#825A36', fontFamily: fonts.medium },
  },
  category: {
    background: { backgroundColor: '#FFFFFF' },
    selectedBackground: { backgroundColor: '#CDECCB' },
    text: { color: '#5E655E' },
    selectedText: { color: '#466349', fontFamily: fonts.medium },
  },
};
