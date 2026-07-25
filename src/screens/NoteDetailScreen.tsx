import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import { useAppAlert } from '../components/AppAlert';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { deleteLocalNote, getNote, updateNote } from '../database/database';
import { NOTE_CATEGORIES, NOTE_EMOTIONS, NOTE_TYPES, Note, NoteCategory, NoteEmotion, NoteType } from '../types/note';
import { RootStackParamList } from '../types/navigation';
import { colors, fonts } from '../theme';

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
  const db = useSQLiteContext();
  const { session } = useAuth();
  const { alert } = useAppAlert();
  const [note, setNote] = useState<Note | null>(null);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('暂不分类');
  const [emotions, setEmotions] = useState<NoteEmotion[]>([]);
  const [categories, setCategories] = useState<NoteCategory[]>([]);
  const [saving, setSaving] = useState(false);

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
      applyNote(updated);
      setEditing(false);
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
          await deleteLocalNote(db, session.user.id, note.id);
          navigation.goBack();
        },
      },
    ]);
  };

  if (!note) {
    return null;
  }

  return (
    <Screen backgroundColor="#F7FAF8" keyboardAvoiding keyboardAvoidingMode="fullscreen" contentStyle={styles.content}>
      <View style={styles.card}>
        <View pointerEvents="none" style={styles.cardAccent} />
        <View style={styles.cardHeader}>
          <Text selectable style={styles.meta}>{new Date(note.createdAt).toLocaleString('zh-CN', { hour12: false })}</Text>
          <View style={styles.divider} />
        </View>
        {editing ? (
          <TextInput
            autoFocus
            multiline
            value={content}
            onChangeText={setContent}
            placeholder="写下此刻..."
            placeholderTextColor={colors.muted}
            style={styles.noteInput}
            textAlignVertical="top"
          />
        ) : (
          <Text selectable style={styles.noteText}>{note.content}</Text>
        )}
        {note.updatedAt !== note.createdAt ? <Text selectable style={styles.updatedMeta}>更新于 {new Date(note.updatedAt).toLocaleString('zh-CN', { hour12: false })}</Text> : null}
        <View style={styles.cardFooter}>
          <View style={styles.footerDot} />
          <Text style={styles.footerText}>Journal Entry Details</Text>
        </View>
      </View>

      {editing ? (
        <View style={styles.editorSections}>
          <View style={styles.section}>
            <Text style={styles.label}>记录类型</Text>
            <View style={styles.chips}>
              {NOTE_TYPES.map((type) => (
                <Pill key={type} label={type} tone="type" selected={noteType === type} onPress={() => setNoteType(type)} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>当前感受</Text>
            <View style={styles.chips}>
              {NOTE_EMOTIONS.map((emotion) => (
                <Pill
                  key={emotion}
                  label={emotion}
                  tone="emotion"
                  selected={emotions.includes(emotion)}
                  onPress={() => setEmotions((current) => toggleItem(current, emotion))}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>初步判断</Text>
            <View style={styles.chips}>
              {NOTE_CATEGORIES.map((category) => (
                <Pill
                  key={category}
                  label={category}
                  tone="category"
                  selected={categories.includes(category)}
                  onPress={() => setCategories((current) => toggleItem(current, category))}
                />
              ))}
            </View>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.chips}>
            <Text style={[styles.tag, styles.typeTag]}>{note.noteType}</Text>
            {note.emotions.map((tag) => <Text key={tag} style={[styles.tag, styles.emotionTag]}>{tag}</Text>)}
            {note.categories.map((tag) => <Text key={tag} style={[styles.tag, styles.categoryTag]}>{tag}</Text>)}
          </View>
        </>
      )}

      <View style={styles.actions}>
        {editing ? (
          <>
            <HapticPressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => { applyNote(note); setEditing(false); }}>
              <Text style={styles.secondaryText}>取消</Text>
            </HapticPressable>
            <HapticPressable disabled={saving} style={({ pressed }) => [styles.primaryButton, (pressed || saving) && styles.pressed]} onPress={save}>
              <Text style={styles.primaryText}>{saving ? '保存中...' : '保存修改'}</Text>
            </HapticPressable>
          </>
        ) : (
          <>
            <HapticPressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => setEditing(true)}>
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text style={styles.secondaryText}>编辑</Text>
            </HapticPressable>
            <HapticPressable style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]} onPress={remove}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={styles.dangerText}>删除</Text>
            </HapticPressable>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 20, paddingHorizontal: 30, paddingBottom: 130, gap: 32 },
  card: {
    minHeight: 424,
    overflow: 'hidden',
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 30,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 12px 24px -12px rgba(70, 99, 73, 0.08)',
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: '#D8EED8' },
  cardHeader: { gap: 9 },
  divider: { height: 1, backgroundColor: '#E0E5E0' },
  noteText: { marginTop: 24, color: '#181C1C', fontFamily: fonts.medium, fontSize: 16, lineHeight: 26 },
  noteInput: {
    flex: 1,
    minHeight: 160,
    marginTop: 18,
    padding: 0,
    color: '#181C1C',
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 26,
  },
  meta: { color: '#7B827B', fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  updatedMeta: { marginTop: 8, color: '#A0A7A0', fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  cardFooter: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8FAF93' },
  footerText: { color: '#ABB0AB', fontFamily: fonts.regular, fontSize: 12, letterSpacing: 0.2 },
  section: { gap: 10 },
  editorSections: { gap: 20 },
  label: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tag: {
    color: '#424841',
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  typeTag: { backgroundColor: '#EFF0EE' },
  emotionTag: { backgroundColor: '#FFF0DE' },
  categoryTag: { backgroundColor: '#E4F4E5' },
  input: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  contentInput: { minHeight: 240, textAlignVertical: 'top' },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 16 },
  primaryButton: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#466349',
  },
  primaryText: { color: colors.white, fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  secondaryButton: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#CDECCB',
  },
  secondaryText: { color: '#466349', fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  dangerButton: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    backgroundColor: '#FFD6D5',
  },
  dangerText: { color: '#B2272A', fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
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
