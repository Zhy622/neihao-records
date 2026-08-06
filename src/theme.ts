import { useMemo } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

export const lightColors = {
  background: '#F7FAF8',
  card: '#FFFFFF',
  cardTemp:'#FFFFFF',
  cardSecondary: '#F1F4F2',
  text: '#181C1C',
  textSecondary: '#596159',
  border: '#E3E8E3',
  brand: '#466349',
  brandSoft: '#E5ECE6',
  danger: '#C43D3D',
  dangerSoft: '#F8EAEA',
  overlay: 'rgba(35, 45, 37, 0.28)',
  buttonForeground: '#FFFFFF',
  input: '#F1F4F2',
  placeholder: '#737971',
  warm: '#7A532A',
  warmSoft: '#FFF3E8',
  purple: '#665B7C',
  purpleSoft: '#F3F0FA',
  positive: '#314D34',
  positiveSoft: '#E5F1E5',
  shadow: 'rgba(70, 99, 73, 0.08)',
  transparent: 'transparent',
  primary: '#466349',
  primarySoft: '#E5ECE6',
  muted: '#596159',
  surface: '#FFFFFF',
  white: '#FFFFFF',
};

export const darkColors = {
  background: '#111614',
  card: '#1B221E',
  cardTemp:'#223329',
  cardSecondary: '#26302A',
  text: '#F0F5F0',
  textSecondary: '#B5C0B7',
  border: '#37443C',
  brand: '#81ec7d',
  brandSoft: '#284333',
  danger: '#FF9B94',
  dangerSoft: '#4A2929',
  overlay: 'rgba(0, 0, 0, 0.62)',
  buttonForeground: '#101612',
  input: '#26302A',
  placeholder: '#9BA89E',
  warm: '#F4BC80',
  warmSoft: 'rgba(37, 66, 45, 0.32)',
  purple: '#C9B8F3',
  purpleSoft: '#342B4B',
  positive: '#B5E3A8',
  positiveSoft: 'rgba(37, 66, 45, 0.32)',
  shadow: 'rgba(0, 0, 0, 0.32)',
  transparent: 'transparent',
  primary: '#9BC7A2',
  primarySoft: '#284333',
  muted: '#B5C0B7',
  surface: '#1B221E',
  white: '#101612',
};

// ponytail: compatibility alias while legacy callers are migrated to useAppTheme.
export const colors = lightColors;

export type AppColors = typeof lightColors;

export function useAppTheme() {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? darkColors : lightColors;

  return useMemo(() => ({ colors, isDark: scheme === 'dark' }), [colors, scheme]);
}

export function useThemedStyles(createStyles: (colors: AppColors) => any): any {
  const { colors } = useAppTheme();
  return useMemo(() => StyleSheet.create(createStyles(colors)), [colors, createStyles]);
}

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};
