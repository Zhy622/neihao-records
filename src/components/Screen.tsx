import { PropsWithChildren } from 'react';
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
}

export function Screen({
  children,
  contentStyle,
  keyboardAvoiding = false,
}: PropsWithChildren<ScreenProps>) {
  const content = (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
  content: { padding: 20, paddingBottom: 40, gap: 16 },
});
