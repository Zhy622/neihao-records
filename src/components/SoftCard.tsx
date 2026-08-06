import { PropsWithChildren } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '../theme';

interface SoftCardProps {
  colors?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
}

export function SoftCard({
  children,
  colors: gradientColors,
  style,
}: PropsWithChildren<SoftCardProps>) {
  const { colors } = useAppTheme();
  return (
    <LinearGradient colors={gradientColors ?? [colors.card, colors.purpleSoft]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { boxShadow: `0 6px 18px ${colors.shadow}` }, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
  },
});
