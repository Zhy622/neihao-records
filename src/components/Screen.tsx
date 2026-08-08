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
import { useAppTheme } from '../theme';

interface ScreenProps {
  backgroundColor?: string;
  contentStyle?: StyleProp<ViewStyle>;
  keyboardAvoiding?: boolean;
  keyboardAvoidingMode?: 'header' | 'fullscreen';
  scrollViewRef?: Ref<ScrollView>;
}

export function Screen({
  backgroundColor,
  children,
  contentStyle,
  keyboardAvoiding = false,
  keyboardAvoidingMode = 'header',
  scrollViewRef,
}: PropsWithChildren<ScreenProps>) {
  const { colors } = useAppTheme();
  const resolvedBackgroundColor = backgroundColor ?? colors.background;
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const bottomTabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const shouldAvoidKeyboard =
    keyboardAvoiding && (Platform.OS === 'ios' || keyboardAvoidingMode === 'fullscreen');
  const keyboardVerticalOffset =
    keyboardAvoidingMode === 'header' && Platform.OS === 'ios' ? headerHeight : 0;
  const bottomPadding = 40 + bottomTabBarHeight;
  const content = (
    <ScrollView
      ref={scrollViewRef}
      style={[styles.scroll, { backgroundColor: resolvedBackgroundColor }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }, contentStyle]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
