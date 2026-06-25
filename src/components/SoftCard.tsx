import { PropsWithChildren } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme';

interface SoftCardProps {
  colors?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
}

export function SoftCard({
  children,
  colors: gradientColors = ['#FFFEFC', '#F3F0FA'],
  style,
}: PropsWithChildren<SoftCardProps>) {
  return (
    <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, style]}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    boxShadow: '0 6px 18px rgba(79, 88, 82, 0.06)',
  },
});
