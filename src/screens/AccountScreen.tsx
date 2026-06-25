import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { SoftCard } from '../components/SoftCard';
import { colors, fonts } from '../theme';

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

      <SoftCard colors={['#FFFEFC', '#F1F3FA']} style={styles.details}>
        <View style={styles.row}>
          <Ionicons name="person-outline" size={18} color={colors.primary} />
          <Text style={styles.label}>昵称</Text>
          <Text selectable style={styles.value}>{session?.user.displayName || '未设置'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Ionicons name="mail-outline" size={18} color={colors.primary} />
          <Text style={styles.label}>邮箱</Text>
          <Text selectable style={styles.value}>{session?.user.email}</Text>
        </View>
      </SoftCard>

      <HapticPressable
        disabled={signingOut}
        onPress={() => void handleSignOut()}
        style={({ pressed }) => [styles.signOut, (pressed || signingOut) && styles.pressed]}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.signOutText}>{signingOut ? '正在退出…' : '退出登录'}</Text>
      </HapticPressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 7, paddingVertical: 8 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 27 },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, lineHeight: 21 },
  details: { marginTop: 6, padding: 18 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { width: 46, color: colors.muted, fontFamily: fonts.medium },
  value: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  signOut: {
    minHeight: 50,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E7CFCF',
    borderRadius: 18,
    backgroundColor: '#FFFBFA',
  },
  signOutText: { color: colors.danger, fontFamily: fonts.semibold, fontSize: 16 },
  pressed: { opacity: 0.7 },
});
