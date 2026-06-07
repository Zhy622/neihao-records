import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { ADVICE_RULES } from '../constants/advice';
import { CATEGORIES } from '../types/record';
import { colors } from '../theme';

export function AdviceScreen() {
  return (
    <Screen>
      <View style={styles.header}><Text style={styles.title}>固定规则</Text><Text style={styles.subtitle}>用提前想好的规则，替代当下反复消耗。</Text></View>
      {CATEGORIES.map((category) => (
        <View key={category} style={styles.card}>
          <Text style={styles.category}>{category}</Text>
          {ADVICE_RULES[category].map((rule, index) => (
            <View key={rule} style={styles.ruleRow}>
              <Text style={styles.number}>{index + 1}</Text>
              <Text style={styles.rule}>{rule}</Text>
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 7, marginBottom: 4 },
  title: { color: colors.text, fontSize: 27, fontWeight: '700' },
  subtitle: { color: colors.muted, lineHeight: 21 },
  card: { gap: 13, padding: 17, borderRadius: 16, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  category: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  ruleRow: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  number: { color: colors.primary, backgroundColor: colors.primarySoft, width: 24, height: 24, borderRadius: 12, textAlign: 'center', lineHeight: 24, fontWeight: '700' },
  rule: { flex: 1, color: colors.text, lineHeight: 22 },
});
