import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { Screen } from '../components/Screen';
import { colors } from '../theme';

export function AccountScreen() {
  const { session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>账号</Text>
        <Text style={styles.subtitle}>管理当前登录信息。</Text>
      </View>

      <View style={styles.details}>
        <View style={styles.row}>
          <Text style={styles.label}>昵称</Text>
          <Text selectable style={styles.value}>{session?.user.displayName || '未设置'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>邮箱</Text>
          <Text selectable style={styles.value}>{session?.user.email}</Text>
        </View>
      </View>

      <Pressable
        disabled={signingOut}
        onPress={() => void handleSignOut()}
        style={({ pressed }) => [styles.signOut, (pressed || signingOut) && styles.pressed]}
      >
        <Text style={styles.signOutText}>{signingOut ? '正在退出…' : '退出登录'}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 7, paddingVertical: 8 },
  title: { color: colors.text, fontSize: 27, fontWeight: '700' },
  subtitle: { color: colors.muted, lineHeight: 21 },
  details: { marginTop: 6 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 18 },
  label: { width: 54, color: colors.muted },
  value: { flex: 1, color: colors.text, fontSize: 15 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  signOut: {
    minHeight: 50,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
  },
  signOutText: { color: colors.danger, fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
