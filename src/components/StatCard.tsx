import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { Text, View } from '../tw';
import { colors, fonts } from '../theme';

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <LinearGradient colors={['#FFFEFC', '#F1F3FA']} style={styles.card}>
      <View className="gap-1">
        <Text className="text-[24px] text-app-text" style={styles.value}>{value}</Text>
        <Text className="text-[13px] text-app-muted" style={styles.label}>{label}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    padding: 17,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0 5px 16px rgba(79, 88, 82, 0.05)',
  },
  value: { fontFamily: fonts.bold },
  label: { fontFamily: fonts.regular },
});
