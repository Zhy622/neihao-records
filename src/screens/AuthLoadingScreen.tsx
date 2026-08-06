import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function AuthLoadingScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.brand} size="large" />
      <Text style={styles.text}>正在恢复登录状态…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: colors.background,
  },
  text: { color: colors.textSecondary, fontSize: 14 },
});
