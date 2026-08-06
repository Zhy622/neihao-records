import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { AppColors, fonts, useAppTheme, useThemedStyles } from '../theme';

export function EmptyState({
  icon = 'leaf-outline',
  title,
  description,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <LinearGradient colors={[colors.card, colors.brandSoft]} style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={colors.brand} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </LinearGradient>
  );
}

const createStyles = (colors: AppColors) => ({
  wrap: {
    alignItems: 'center',
    gap: 9,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandSoft,
  },
  title: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  description: { color: colors.textSecondary, fontFamily: fonts.regular, lineHeight: 21, textAlign: 'center' },
});
