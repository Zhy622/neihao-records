import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { useNotes } from '../hooks/useNotes';
import { Note, NoteCategoryFilter } from '../types/note';
import { RootStackParamList } from '../types/navigation';
import { AppColors, fonts, useAppTheme, useThemedStyles } from '../theme';

const NOTE_CATEGORY_FILTERS = [
  { label: '全部', value: undefined },
  { label: '积极的', value: '积极的' },
  { label: '负面的', value: '负面的' },
] as const;

function getNoteTitle(content: string) {
  return content.trim().split(/\r?\n/, 1)[0] || '未命名随记';
}

function getNoteTypeIcon(noteType: Note['noteType']) {
  switch (noteType) {
    case '一个想法':
      return 'bulb-outline' as const;
    case '一件事情':
      return 'checkbox-outline' as const;
    case '一段感受':
      return 'heart-outline' as const;
    case '一个灵感':
      return 'sparkles-outline' as const;
    case '一个发现':
      return 'compass-outline' as const;
    default:
      return 'pricetag-outline' as const;
  }
}

export function NoteHistoryScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'NoteHistory'>) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [category, setCategory] = useState<NoteCategoryFilter>();
  const { notes, loadMore, isLoading, isRefreshing, isLoadingMore, hasMore } = useNotes({ category });

  return (
    <Screen backgroundColor={colors.background} contentStyle={styles.content}>
      <View style={styles.categoryOptions}>
        {NOTE_CATEGORY_FILTERS.map((item) => {
          const selected = category === item.value;
          return (
            <HapticPressable
              key={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              feedback="selection"
              style={({ pressed }) => [
                styles.categoryOption,
                selected && styles.selectedCategoryOption,
                pressed && styles.pressed,
              ]}
              onPress={() => setCategory(item.value)}
            >
              <Text style={[styles.categoryOptionText, selected && styles.selectedCategoryOptionText]}>
                {item.label}
              </Text>
            </HapticPressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.loadingText}>正在查询随记...</Text>
        </View>
      ) : notes.length ? (
        <View style={styles.list}>
          {isRefreshing ? (
            <View style={styles.refreshing}>
              <ActivityIndicator color={colors.brand} size="small" />
              <Text style={styles.refreshingText}>同步中...</Text>
            </View>
          ) : null}
          {notes.map((note) => (
            <HapticPressable
              key={note.id}
              accessibilityRole="button"
              accessibilityLabel={`查看随记：${getNoteTitle(note.content)}`}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => navigation.navigate('NoteDetail', { id: note.id })}
            >
              <View style={styles.cardHeader}>
                <Text numberOfLines={1} style={styles.noteTitle}>{getNoteTitle(note.content)}</Text>
                <View style={styles.type}>
                  <Ionicons name={getNoteTypeIcon(note.noteType)} size={17} color={colors.brand} />
                  <Text numberOfLines={1} style={styles.typeText}>{note.noteType}</Text>
                </View>
              </View>
              <Text style={styles.meta}>{new Date(note.createdAt).toLocaleString('zh-CN', { hour12: false })}</Text>
              <View style={styles.cardFooter}>
                <View style={styles.tags}>
                  {[...note.emotions, ...note.categories].slice(0, 3).map((tag, index) => (
                    <Text key={tag} style={[styles.tag, { backgroundColor: [colors.positiveSoft, colors.warmSoft, colors.cardSecondary][index] }]}>{tag}</Text>
                  ))}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.placeholder} />
              </View>
            </HapticPressable>
          ))}
          {hasMore ? (
            <HapticPressable
              disabled={isLoadingMore}
              style={({ pressed }) => [styles.loadMoreButton, (pressed || isLoadingMore) && styles.pressed]}
              onPress={() => void loadMore()}
            >
              {isLoadingMore ? <ActivityIndicator color={colors.brand} size="small" /> : null}
              <Text style={styles.loadMoreText}>{isLoadingMore ? '加载中...' : '加载更多'}</Text>
            </HapticPressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.empty}>
          <View style={styles.iconWrap}>
            <Ionicons name="reader-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>随记记录</Text>
          <Text style={styles.message}>写下一条随记后，它会出现在这里。</Text>
          <HapticPressable style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={() => navigation.goBack()}>
            <Ionicons name="create-outline" size={18} color={colors.buttonForeground} />
            <Text style={styles.buttonText}>写下此刻</Text>
          </HapticPressable>
        </View>
      )}
    </Screen>
  );
}

const createStyles = (colors: AppColors) => ({
  content: { flexGrow: 1, paddingTop: 32, paddingHorizontal: 30, paddingBottom: 130 },
  categoryOptions: {
    height: 52,
    flexDirection: 'row',
    marginBottom: 20,
    padding: 4,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: colors.input,
  },
  categoryOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  selectedCategoryOption: { backgroundColor: colors.card, boxShadow: `0 1px 1px ${colors.shadow}` },
  categoryOptionText: { color: colors.placeholder, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  selectedCategoryOptionText: { color: colors.brand },
  loading: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 34 },
  loadingText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 14 },
  refreshing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  refreshingText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 13 },
  list: { gap: 16 },
  loadMoreButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.brandSoft,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 18,
  },
  loadMoreText: { color: colors.brand, fontFamily: fonts.semibold, fontSize: 14 },
  card: {
    minHeight: 142,
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 28,
    borderCurve: 'continuous',
    backgroundColor: colors.card,
    boxShadow: `0 12px 24px -12px ${colors.shadow}`,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noteTitle: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 16, lineHeight: 25 },
  type: { maxWidth: '48%', flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 4 },
  typeText: { flexShrink: 1, color: colors.brand, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  meta: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  tags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    color: colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  empty: { alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
  },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  message: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  button: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: colors.brand,
  },
  buttonText: { color: colors.buttonForeground, fontFamily: fonts.bold, fontSize: 15 },
  pressed: { opacity: 0.78 },
});
