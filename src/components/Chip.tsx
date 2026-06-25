import { StyleSheet, Text } from 'react-native';
import { HapticPressable } from './HapticPressable';
import { colors, fonts } from '../theme';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected, onPress }: Props) {
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

const styles = StyleSheet.create({
  chip: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: colors.surface,
  },
  selected: { backgroundColor: '#E8E1F4', borderColor: '#C8BEDD' },
  pressed: { opacity: 0.75 },
  text: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14 },
  selectedText: { color: '#665B7C', fontFamily: fonts.semibold },
});
