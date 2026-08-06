import { StyleSheet, Text } from 'react-native';
import { HapticPressable } from './HapticPressable';
import { AppColors, fonts, useThemedStyles } from '../theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <HapticPressable
      feedback="selection"
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}
    >
      <Text style={[styles.text, selected && styles.selectedText]}>{label}</Text>
    </HapticPressable>
  );
}

const createStyles = (colors: AppColors) => ({
  chip: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.card,
  },
  selected: { backgroundColor: colors.purpleSoft, borderColor: colors.purple },
  pressed: { opacity: 0.75 },
  text: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 14 },
  selectedText: { color: colors.purple, fontFamily: fonts.semibold },
});
