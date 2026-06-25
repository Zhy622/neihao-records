import { PropsWithChildren, Ref, useContext } from 'react';
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
import { colors } from '../theme';

interface ScreenProps {
  contentStyle?: StyleProp<ViewStyle>;
  keyboardAvoiding?: boolean;
  keyboardAvoidingMode?: 'header' | 'fullscreen';
  scrollViewRef?: Ref<ScrollView>;
}

export function Screen({
  children,
  contentStyle,
  keyboardAvoiding = false,
  keyboardAvoidingMode = 'header',
  scrollViewRef,
}: PropsWithChildren<ScreenProps>) {
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const shouldAvoidKeyboard =
    keyboardAvoiding && (Platform.OS === 'ios' || keyboardAvoidingMode === 'fullscreen');
  const keyboardVerticalOffset =
    keyboardAvoidingMode === 'header' && Platform.OS === 'ios' ? headerHeight : 0;
  const content = (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scroll}
      contentContainerStyle={[styles.content, contentStyle]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {shouldAvoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
  safe: { flex: 1, backgroundColor: colors.background },
  keyboardAvoiding: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
});
