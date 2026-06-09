import { PropsWithChildren, Ref } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface ScreenProps {
  contentStyle?: ViewStyle;
  keyboardAvoiding?: boolean;
  scrollViewRef?: Ref<ScrollView>;
}

export function Screen({
  children,
  contentStyle,
  keyboardAvoiding = false,
  scrollViewRef,
}: PropsWithChildren<ScreenProps>) {
  const content = (
    <ScrollView
      ref={scrollViewRef}
      style={styles.scroll}
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {keyboardAvoiding && Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          behavior="padding"
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
