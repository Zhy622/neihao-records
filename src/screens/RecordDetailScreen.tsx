import { useCallback, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Line,
  Polygon,
  Stop,
} from 'react-native-svg';
import { useAuth } from '../auth/AuthProvider';
import { createRecordInsight, RecordInsightResponse } from '../api/ai';
import { Chip } from '../components/Chip';
import { useAppAlert } from '../components/AppAlert';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { SoftCard } from '../components/SoftCard';
import { deleteAndSyncRecord, syncRecordById } from '../sync/records-sync';
import { getRecord, updateRecord } from '../database/database';
import {
  CATEGORIES,
  Category,
  DilemmaRecord,
  EMOTIONS,
  Emotion,
  TIME_COSTS,
  TimeCost,
  WORTH_OPTIONS,
  WorthIt,
} from '../types/record';
import { RootStackParamList } from '../types/navigation';
import { colors, fonts } from '../theme';

const levels = Array.from({ length: 10 }, (_, index) => index + 1);
const aiGradientColors = ['#6F8DFF', '#8B7CF6', '#B56BDF'] as const;
const aiTextColors = ['#6F8DFF', '#7F85FA', '#9278F0', '#A36FE8', '#B56BDF'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function DetailCell({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, muted && styles.mutedDetailValue]}>{value}</Text>
    </View>
  );
}

function IntensityCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.intensityRow}>
        <View style={styles.intensityTrack}>
          <View style={[styles.intensityFill, { backgroundColor: color, width: `${value * 10}%` }]} />
        </View>
        <Text style={styles.intensityValue}>{value}/10</Text>
      </View>
    </View>
  );
}

function DetailContentCard({
  icon,
  label,
  value,
  accentColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accentColor: string;
}) {
  return (
    <View style={[styles.detailContentCard, { borderLeftColor: accentColor }]}>
      <View style={styles.contentCardHeading}>
        <Ionicons name={icon} size={16} color={accentColor} />
        <Text style={[styles.contentCardLabel, { color: accentColor }]}>{label}</Text>
      </View>
      <Text style={styles.note}>{value || '未填写'}</Text>
    </View>
  );
}

function AiInsightLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.aiInsightLine}>
      <Text style={styles.aiInsightLabel}>{label}</Text>
      <Text style={styles.aiInsightText}>{value}</Text>
    </View>
  );
}

function AiGradientIcon({ size = 30 }: { size?: number }) {
  return (
    <View style={[styles.aiHexIcon, { height: size, width: size }]}>
      <Svg height={size} viewBox="0 0 100 100" width={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id="aiHexGradient" x1="5%" y1="5%" x2="95%" y2="95%">
            <Stop offset="0%" stopColor="#6F8DFF" />
            <Stop offset="52%" stopColor="#8B7CF6" />
            <Stop offset="100%" stopColor="#B56BDF" />
          </SvgLinearGradient>
        </Defs>
        <Polygon points="50,4 90,27 90,73 50,96 10,73 10,27" fill="url(#aiHexGradient)" />
        <Polygon
          points="50,12 82,31 82,69 50,88 18,69 18,31"
          fill="none"
          stroke="rgba(218,224,255,0.38)"
          strokeWidth="3"
        />
        <Line x1="27" y1="34" x2="42" y2="34" stroke="rgba(221,226,255,0.58)" strokeWidth="3" strokeLinecap="round" />
        <Line x1="58" y1="66" x2="73" y2="66" stroke="rgba(221,226,255,0.58)" strokeWidth="3" strokeLinecap="round" />
        <Circle cx="25" cy="34" r="3" fill="rgba(221,226,255,0.76)" />
        <Circle cx="75" cy="66" r="3" fill="rgba(221,226,255,0.76)" />
      </Svg>
      <Text style={[styles.aiIconText, { fontSize: size > 30 ? 13 : 10 }]}>AI</Text>
    </View>
  );
}

function AiGradientText({ children }: { children: string }) {
  return (
    <Text style={styles.aiGradientText}>
      {Array.from(children).map((char, index) => (
        <Text key={`${char}-${index}`} style={{ color: aiTextColors[index % aiTextColors.length] }}>
          {char}
        </Text>
      ))}
    </Text>
  );
}

export function RecordDetailScreen({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'RecordDetail'>) {
  const db = useSQLiteContext();
  const { session } = useAuth();
  const { alert } = useAppAlert();
  const scrollViewRef = useRef<ScrollView>(null);
  const [record, setRecord] = useState<DilemmaRecord | null>(null);
  const [editing, setEditing] = useState(false);
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
  const [deleting, setDeleting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<RecordInsightResponse | null>(null);

  const applyRecord = useCallback((nextRecord: DilemmaRecord | null) => {
    setRecord(nextRecord);

    if (!nextRecord) {
      return;
    }

    setTitle(nextRecord.title);
    setCategory(nextRecord.category);
    setEmotions(nextRecord.emotions);
    setEmotionIntensity(nextRecord.emotionIntensity);
    setDecisionDifficulty(nextRecord.decisionDifficulty);
    setTimeCost(nextRecord.timeCost);
    setThoughts(nextRecord.thoughts);
    setFinalDecision(nextRecord.finalDecision);
    setWorthIt(nextRecord.worthIt);
  }, []);

  const loadRecord = useCallback(async () => {
    if (!session) {
      return;
    }

    const nextRecord = await getRecord(db, session.user.id, route.params.id);
    applyRecord(nextRecord);
    if (!nextRecord) {
      navigation.goBack();
    }
  }, [applyRecord, db, navigation, route.params.id, session]);

  useFocusEffect(useCallback(() => { void loadRecord(); }, [loadRecord]));

  const toggleEmotion = (emotion: Emotion) => {
    setEmotions((current) =>
      current.includes(emotion) ? current.filter((item) => item !== emotion) : [...current, emotion],
    );
  };

  const revealBottomFields = () => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
  };

  const save = async () => {
    if (!session || !record) {
      return;
    }

    if (!title.trim()) {
      alert('还差一点', '请写下这次纠结的事情。');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateRecord(db, session.user.id, record.id, {
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

      if (!updated) {
        throw new Error('Record was not updated.');
      }

      const synced = await syncRecordById(db, session.user.id, updated.id);
      applyRecord((await getRecord(db, session.user.id, updated.id)) ?? updated);
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
    if (!session || !record) {
      return;
    }

    alert('删除这条记录？', '删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            const synced = await deleteAndSyncRecord(db, session.user.id, record.id);
            if (!synced) {
              alert('已从本机移除', '服务器删除会在联网后自动重试。');
            }
            navigation.goBack();
          } catch {
            alert('删除失败', '这条记录暂时没有删除，请稍后再试。');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const generateAiInsight = async () => {
    if (!session || !record || aiLoading) {
      return;
    }

    try {
      setAiLoading(true);
      let targetRecord = record;

      if (!targetRecord.serverId || targetRecord.syncStatus !== 'synced') {
        const synced = await syncRecordById(db, session.user.id, targetRecord.id);
        targetRecord = (await getRecord(db, session.user.id, targetRecord.id)) ?? targetRecord;
        applyRecord(targetRecord);

        if (!synced || !targetRecord.serverId || targetRecord.syncStatus !== 'synced') {
          alert('暂时无法复盘', '请先联网同步这条记录后再试。');
          return;
        }
      }

      const insight = await createRecordInsight(targetRecord.serverId);
      setAiInsight(insight);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 160);
    } catch {
      alert('AI复盘失败', '暂时无法生成复盘，请稍后再试。');
    } finally {
      setAiLoading(false);
    }
  };

  if (!record) {
    return (
      <Screen>
        <Text style={styles.empty}>正在读取记录…</Text>
      </Screen>
    );
  }

  return (
    <Screen
      backgroundColor="#F7FAF8"
      keyboardAvoiding
      scrollViewRef={scrollViewRef}
      contentStyle={styles.content}
    >
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <Text style={styles.date}>{new Date(record.createdAt).toLocaleString('zh-CN')}</Text>
          <View style={[styles.syncStatus, record.syncStatus !== 'synced' && styles.pendingSyncStatus]}>
            <Ionicons
              name={record.syncStatus === 'synced' ? 'checkmark-circle' : 'cloud-offline-outline'}
              size={12}
              color={record.syncStatus === 'synced' ? '#466349' : '#665B7C'}
            />
            <Text style={[styles.syncStatusText, record.syncStatus !== 'synced' && styles.pendingSyncText]}>
              {record.syncStatus === 'synced' ? '已同步' : '待同步'}
            </Text>
          </View>
        </View>
        <Text style={styles.title}>{record.title}</Text>
      </View>

      {editing ? (
        <View style={styles.form}>
          <Field label="这次纠结的事情 *">
            <TextInput value={title} onChangeText={setTitle} placeholder="例如：要不要接下这个任务" placeholderTextColor={colors.muted} style={styles.input} />
          </Field>
          <Field label="分类">
            <View style={styles.chips}>{CATEGORIES.map((item) => <Chip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />)}</View>
          </Field>
          <Field label="当时的感受">
            <View style={styles.chips}>{EMOTIONS.map((item) => <Chip key={item} label={item} selected={emotions.includes(item)} onPress={() => toggleEmotion(item)} />)}</View>
          </Field>
          <Field label={`情绪强度 · ${emotionIntensity}/10`}>
            <View style={styles.chips}>{levels.map((level) => <Chip key={level} label={String(level)} selected={emotionIntensity === level} onPress={() => setEmotionIntensity(level)} />)}</View>
          </Field>
          <Field label={`决策难度 · ${decisionDifficulty}/10`}>
            <View style={styles.chips}>{levels.map((level) => <Chip key={level} label={String(level)} selected={decisionDifficulty === level} onPress={() => setDecisionDifficulty(level)} />)}</View>
          </Field>
          <Field label="耗费时间">
            <View style={styles.chips}>{TIME_COSTS.map((item) => <Chip key={item} label={item} selected={timeCost === item} onPress={() => setTimeCost(item)} />)}</View>
          </Field>
          <Field label="当时反复出现的想法">
            <TextInput value={thoughts} onChangeText={setThoughts} onFocus={revealBottomFields} placeholder="脑海里一直在想什么？" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline />
          </Field>
          <Field label="最后怎么决定">
            <TextInput value={finalDecision} onChangeText={setFinalDecision} onFocus={revealBottomFields} placeholder="写下最终选择或暂时的处理方式" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline />
          </Field>
          <Field label="事后看是否值得纠结">
            <View style={styles.chips}>{WORTH_OPTIONS.map((item) => <Chip key={item} label={item} selected={worthIt === item} onPress={() => setWorthIt(item)} />)}</View>
          </Field>
        </View>
      ) : (
        <>
          <View style={styles.detailGridCard}>
            <View style={styles.detailGrid}>
              <View style={styles.detailRow}>
                <DetailCell label="分类" value={record.category} />
                <DetailCell label="感受" value={record.emotions.length ? record.emotions.join('、') : '未填写'} muted={!record.emotions.length} />
              </View>
              <View style={styles.detailRow}>
                <IntensityCell label="情绪强度" value={record.emotionIntensity} color="#466349" />
                <IntensityCell label="决策难度" value={record.decisionDifficulty} color="#7D562D" />
              </View>
              <View style={styles.detailRow}>
                <DetailCell label="耗费时间" value={record.timeCost} />
                <DetailCell label="事后看" value={record.worthIt} />
              </View>
            </View>
          </View>
          <View style={styles.detailCards}>
            <DetailContentCard
              accentColor="#466349"
              icon="bulb-outline"
              label="当时反复出现的想法"
              value={record.thoughts}
            />
            <DetailContentCard
              accentColor="#7D562D"
              icon="hammer-outline"
              label="最后怎么决定"
              value={record.finalDecision}
            />
          </View>
        </>
      )}

      <View style={styles.actions}>
        {editing ? (
          <>
            <HapticPressable disabled={saving} style={({ pressed }) => [styles.secondaryButton, (pressed || saving) && styles.pressed]} onPress={() => { applyRecord(record); setEditing(false); }}>
              <Text style={styles.secondaryButtonText}>取消</Text>
            </HapticPressable>
            <HapticPressable disabled={saving} style={({ pressed }) => [styles.primaryButton, (pressed || saving) && styles.pressed]} onPress={() => void save()}>
              <Ionicons name="checkmark-circle-outline" size={19} color={colors.white} />
              <Text style={styles.primaryButtonText}>{saving ? '保存中…' : '保存修改'}</Text>
            </HapticPressable>
          </>
        ) : (
          <>
            <HapticPressable disabled={deleting} style={({ pressed }) => [styles.editButton, (pressed || deleting) && styles.pressed]} onPress={() => setEditing(true)}>
              <Ionicons name="create-outline" size={18} color="#314D34" />
              <Text style={styles.editButtonText}>编辑</Text>
            </HapticPressable>
            <HapticPressable disabled={deleting} style={({ pressed }) => [styles.deleteButton, (pressed || deleting) && styles.pressed]} onPress={confirmDelete}>
              <Ionicons name="trash-outline" size={18} color="#93000A" />
              <Text style={styles.deleteButtonText}>{deleting ? '删除中…' : '删除'}</Text>
            </HapticPressable>
          </>
        )}
      </View>

      {!editing ? (
        <View style={styles.aiActionWrap}>
          <HapticPressable
            disabled={aiLoading || deleting}
            feedback="selection"
            style={({ pressed }) => [
              styles.aiAction,
              (pressed || aiLoading || deleting) && styles.pressed,
            ]}
            onPress={() => void generateAiInsight()}
          >
            <AiGradientIcon size={28} />
            <View style={styles.aiActionTextWrap}>
              <AiGradientText>{aiLoading ? 'AI复盘中…' : 'AI复盘'}</AiGradientText>
              <LinearGradient
                colors={aiGradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.aiActionUnderline}
              />
            </View>
            {aiLoading ? <ActivityIndicator color="#8B82F4" size="small" /> : null}
          </HapticPressable>
        </View>
      ) : null}

      {aiInsight ? (
        <Animated.View entering={FadeInUp.duration(260).springify().damping(18)}>
          <SoftCard colors={['#FFFEFC', '#EEF5EF']} style={styles.aiResultCard}>
            <View style={styles.aiResultHeader}>
              <AiGradientIcon size={34} />
              <View style={styles.aiHeaderText}>
                <Text style={styles.aiResultTitle}>AI复盘</Text>
                <Text style={styles.aiResultMeta}>
                  {aiInsight.provider} · {aiInsight.model}
                </Text>
              </View>
            </View>
            <AiInsightLine label="概要" value={aiInsight.result.summary} />
            <AiInsightLine label="核心拉扯" value={aiInsight.result.coreConflict} />
            <AiInsightLine label="温和提问" value={aiInsight.result.gentleQuestion} />
            <AiInsightLine label="下一步行动" value={aiInsight.result.nextAction} />
          </SoftCard>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 32, paddingBottom: 128, gap: 32 },
  header: { gap: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  date: { color: '#737971', fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, letterSpacing: 0.6 },
  title: { color: '#181C1C', fontFamily: fonts.medium, fontSize: 26, lineHeight: 42, letterSpacing: -0.65, paddingTop: 8 },
  syncStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(70, 99, 73, 0.2)', backgroundColor: 'rgba(70, 99, 73, 0.1)', paddingHorizontal: 13, paddingVertical: 5 },
  pendingSyncStatus: { borderColor: '#D8D1E8', backgroundColor: '#F3F0FA' },
  syncStatusText: { color: '#466349', fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  pendingSyncText: { color: '#665B7C' },
  form: { gap: 16 },
  field: { gap: 9 },
  label: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 13, fontFamily: fonts.regular, fontSize: 15 },
  multiline: { minHeight: 92, textAlignVertical: 'top' },
  detailGridCard: { padding: 21, borderRadius: 24, borderCurve: 'continuous', backgroundColor: '#FFFFFF', boxShadow: '0 8px 15px rgba(70, 99, 73, 0.04)' },
  detailGrid: { gap: 16 },
  detailRow: { flexDirection: 'row', gap: 24 },
  detailCell: { flex: 1, gap: 4 },
  detailLabel: { color: '#737971', fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  detailValue: { color: '#181C1C', fontFamily: fonts.medium, fontSize: 16, lineHeight: 26 },
  mutedDetailValue: { color: '#424841', fontFamily: fonts.regular },
  intensityRow: { height: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  intensityTrack: { flex: 1, height: 6, overflow: 'hidden', borderRadius: 999, backgroundColor: '#E0E3E1' },
  intensityFill: { height: '100%', borderRadius: 999 },
  intensityValue: { color: '#181C1C', fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  detailCards: { gap: 16 },
  detailContentCard: { gap: 12, paddingVertical: 24, paddingLeft: 24, paddingRight: 24, borderLeftWidth: 4, borderRadius: 24, borderCurve: 'continuous', backgroundColor: '#F1F4F2', boxShadow: '0 1px 1px rgba(0, 0, 0, 0.05)' },
  contentCardHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contentCardLabel: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  note: { color: '#424841', fontFamily: fonts.medium, fontSize: 16, lineHeight: 26 },
  actions: { flexDirection: 'row', gap: 16 },
  aiActionWrap: { alignItems: 'center', paddingTop: 2 },
  aiAction: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  aiActionTextWrap: { gap: 3 },
  aiActionUnderline: { borderRadius: 99, height: 2, opacity: 0.86 },
  aiGradientText: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20 },
  aiResultCard: { gap: 14, marginTop: 2, borderWidth: 0 },
  aiResultHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  aiHexIcon: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  aiIconText: { color: colors.white, fontFamily: fonts.bold, letterSpacing: 0.2 },
  aiHeaderText: { flex: 1, gap: 2 },
  aiResultTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 18 },
  aiResultMeta: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12 },
  aiInsightLine: { gap: 6 },
  aiInsightLabel: { color: colors.primary, fontFamily: fonts.semibold, fontSize: 14 },
  aiInsightText: { color: colors.text, fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
  primaryButton: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderRadius: 24, backgroundColor: '#466349' },
  primaryButtonText: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
  secondaryButton: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderRadius: 24, backgroundColor: '#CAEBC9' },
  secondaryButtonText: { color: colors.primary, fontFamily: fonts.bold, fontSize: 16 },
  editButton: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderRadius: 24, backgroundColor: '#CAEBC9', boxShadow: '0 1px 1px rgba(0, 0, 0, 0.05)' },
  editButtonText: { color: '#314D34', fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  deleteButton: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderRadius: 24, backgroundColor: '#FFDAD6', boxShadow: '0 1px 1px rgba(0, 0, 0, 0.05)' },
  deleteButtonText: { color: '#93000A', fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  pressed: { opacity: 0.75 },
  empty: { color: colors.muted, fontFamily: fonts.regular, textAlign: 'center', paddingVertical: 40 },
});
