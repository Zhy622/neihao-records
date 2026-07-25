import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

interface StatCardProps {
  compact?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconBackgroundColor?: string;
  iconColor?: string;
  label: string;
  value: string | number;
}

export function StatCard({
  compact = false,
  icon,
  iconBackgroundColor = 'rgba(202, 235, 201, 0.3)',
  iconColor = '#466349',
  label,
  value,
}: StatCardProps) {
  return (
    <LinearGradient
      colors={icon ? ['#FFFFFF', '#FFFFFF'] : ['#FFFEFC', '#F1F3FA']}
      style={[styles.card, icon && styles.homeCard]}
    >
      {icon ? (
        <View style={[styles.icon, { backgroundColor: iconBackgroundColor }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text style={[styles.value, icon && styles.homeValue, compact && styles.compactValue]}>
          {value}
        </Text>
        <Text style={[styles.label, icon && styles.homeLabel]}>{label}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    padding: 14,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: colors.surface,
    // borderWidth: 1,
    // borderColor: colors.border,
    boxShadow: '0 5px 16px rgba(79, 88, 82, 0.05)',
  },
  homeCard: {
    minHeight: 140,
    padding: 16,
    justifyContent: 'space-between',
    // borderColor: 'rgba(194, 200, 191, 0.2)',
    boxShadow: '0 10px 40px -10px rgba(70, 99, 73, 0.08)',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: 4 },
  value: { color: colors.text, fontFamily: fonts.medium, fontSize: 20 },
  homeValue: { color: '#181C1C', fontSize: 28, lineHeight: 36 },
  compactValue: { fontSize: 20, lineHeight: 28 },
  label: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13 },
  homeLabel: {
    color: '#424841',
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 20,
    letterSpacing: 0.14,
  },
});
