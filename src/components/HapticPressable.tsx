import { PropsWithChildren } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, PressableProps } from 'react-native';

type HapticPressableProps = PressableProps & {
  feedback?: 'light' | 'selection' | 'none';
};

export function HapticPressable({
  children,
  feedback = 'light',
  onPress,
  ...props
}: PropsWithChildren<HapticPressableProps>) {
  return (
    <Pressable
      {...props}
      onPress={(event) => {
        if (feedback !== 'none' && Platform.OS !== 'web') {
          if (feedback === 'selection') {
            void Haptics.selectionAsync();
          } else {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
        onPress?.(event);
      }}
    >
      {children}
    </Pressable>
  );
}
