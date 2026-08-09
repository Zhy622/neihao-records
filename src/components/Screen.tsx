import { PropsWithChildren, Ref, useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { HeaderHeightContext } from '@react-navigation/elements';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView, KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { useAppTheme } from '../theme';

interface ScreenProps {
  backgroundColor?: string;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardAvoiding?: boolean;
  keyboardAvoidingMode?: 'header' | 'fullscreen';
  keyboardAware?: boolean;
  keyboardBottomOffset?: number;
  scrollViewRef?: Ref<ScrollView>;
}

export function Screen({
  backgroundColor,
  children,
  contentStyle,
  keyboardAvoiding = false,
  keyboardAvoidingMode = 'header',
  keyboardAware = false,
  keyboardBottomOffset = 20,
  scrollViewRef,
}: PropsWithChildren<ScreenProps>) {
  const { colors } = useAppTheme();
  const resolvedBackgroundColor = backgroundColor ?? colors.background;
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const bottomTabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const shouldAvoidKeyboard =
    !keyboardAware && keyboardAvoiding && (Platform.OS === 'ios' || keyboardAvoidingMode === 'fullscreen');
  const keyboardVerticalOffset =
    keyboardAvoidingMode === 'header' && Platform.OS === 'ios' ? headerHeight : 0;
  const bottomPadding = 40 + bottomTabBarHeight;
  const scrollProps = {
    contentContainerStyle: [styles.content, { paddingBottom: bottomPadding }, contentStyle],
    keyboardDismissMode: 'on-drag' as const,
    keyboardShouldPersistTaps: 'handled' as const,
    style: [styles.scroll, { backgroundColor: resolvedBackgroundColor }],
  };
  const content = keyboardAware ? (
    <KeyboardAwareScrollView
      ref={scrollViewRef as Ref<KeyboardAwareScrollViewRef>}
      bottomOffset={keyboardBottomOffset}
      {...scrollProps}
    >
      {children}
    </KeyboardAwareScrollView>
  ) : (
    <ScrollView
      ref={scrollViewRef}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets={keyboardAware}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: resolvedBackgroundColor }]}
      edges={headerHeight ? [] : ['top']}
    >
      {shouldAvoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : keyboardAware ? 'height' : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
          style={styles.keyboardAvoiding}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  keyboardAvoiding: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
});
