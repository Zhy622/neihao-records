import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { AppColors, fonts, useAppTheme, useThemedStyles } from '../theme';

type AuthMode = 'login' | 'register';

const getSubmitError = (error: unknown, mode: AuthMode) => {
  if (!(error instanceof ApiError)) return '操作失败，请稍后再试。';
  if (error.status === 0) return error.message;
  if (error.status === 409) return '这个邮箱已经注册，可以直接登录。';
  if (error.status === 401 && mode === 'login') return '账号或密码不正确。';
  if (error.status === 400) return '请检查邮箱格式和密码长度。';
  return '服务器暂时无法处理请求，请稍后再试。';
};

export function AuthScreen() {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { signIn, signUp } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const { height } = useWindowDimensions();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isCompact = height < 720;

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setConfirmPassword('');
    setPasswordVisible(false);
    setConfirmPasswordVisible(false);
  };

  const revealFormActions = () => {
    setTimeout(() => scrollViewRef.current?.scrollTo({ y: 180, animated: true }), 180);
  };

  const revealPasswordField = () => {
    setTimeout(() => scrollViewRef.current?.scrollTo({ y: 120, animated: true }), 250);
  };

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 8) {
      setError('请输入有效邮箱，密码至少 8 位。');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('两次输入的密码不一致。');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      if (mode === 'login') {
        await signIn({ email: normalizedEmail, password });
      } else {
        await signUp({ email: normalizedEmail, password, displayName: displayName.trim() || undefined });
      }
    } catch (submitError) {
      setError(getSubmitError(submitError, mode));
      setSubmitting(false);
    }
  };

  const input = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    props: React.ComponentProps<typeof TextInput>,
    canReveal = false,
    visible = false,
    onToggleVisible?: () => void,
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={18} color={colors.placeholder} />
        <TextInput {...props} placeholderTextColor={colors.placeholder} style={styles.input} />
        {canReveal ? (
          <HapticPressable
            accessibilityLabel={visible ? '隐藏密码' : '显示密码'}
            accessibilityRole="button"
            feedback="selection"
            hitSlop={8}
            onPress={onToggleVisible}
            style={styles.visibilityButton}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.placeholder} />
          </HapticPressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <Screen
      backgroundColor={colors.background}
      keyboardAvoiding
      keyboardAvoidingMode="fullscreen"
      scrollViewRef={scrollViewRef}
      contentStyle={[styles.content, isCompact && styles.compactContent]}
    >
      <View style={[styles.brand, isCompact && styles.compactBrand]}>
        <Text style={styles.name}>情绪笔录</Text>
        <Text style={styles.tagline}>记录自己，慢慢看清自己的模式。</Text>
      </View>

      <View style={[styles.authCard, isCompact && styles.compactCard]}>
        <View style={styles.tabs}>
          <HapticPressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'login' }}
            feedback="selection"
            onPress={() => switchMode('login')}
            style={styles.tab}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.selectedTabText]}>登录</Text>
            {mode === 'login' ? <View style={styles.tabIndicator} /> : null}
          </HapticPressable>
          <HapticPressable
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'register' }}
            feedback="selection"
            onPress={() => switchMode('register')}
            style={styles.tab}
          >
            <Text style={[styles.tabText, mode === 'register' && styles.selectedTabText]}>注册</Text>
            {mode === 'register' ? <View style={styles.tabIndicator} /> : null}
          </HapticPressable>
        </View>

        <View style={[styles.form, mode === 'register' && styles.registerForm]}>
          {mode === 'register' ? input('昵称（可选）', 'person-outline', {
            autoComplete: 'name',
            maxLength: 60,
            onChangeText: setDisplayName,
            placeholder: '怎么称呼你？',
            value: displayName,
          }) : null}
          {input('账号', 'person-outline', {
            autoCapitalize: 'none',
            autoComplete: 'email',
            autoCorrect: false,
            keyboardType: 'email-address',
            onChangeText: setEmail,
            placeholder: '请输入您的账号',
            value: email,
          })}
          {input('密码', 'lock-closed-outline', {
            autoCapitalize: 'none',
            autoComplete: mode === 'login' ? 'current-password' : 'new-password',
            onChangeText: setPassword,
            onFocus: mode === 'register' ? revealPasswordField : undefined,
            placeholder: '请输入您的密码',
            secureTextEntry: !passwordVisible,
            value: password,
          }, true, passwordVisible, () => setPasswordVisible((visible) => !visible))}
          {mode === 'register' ? input('确认密码', 'lock-closed-outline', {
            autoCapitalize: 'none',
            autoComplete: 'new-password',
            onChangeText: setConfirmPassword,
            onFocus: revealFormActions,
            placeholder: '请再次输入密码',
            secureTextEntry: !confirmPasswordVisible,
            value: confirmPassword,
          }, true, confirmPasswordVisible, () => setConfirmPasswordVisible((visible) => !visible)) : null}

          {error ? <Text selectable style={styles.error}>{error}</Text> : null}

          <HapticPressable
            disabled={submitting}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.submit,
              mode === 'register' && styles.registerSubmit,
              (pressed || submitting) && styles.pressed,
            ]}
          >
            <Text style={styles.submitText}>{submitting ? '请稍候…' : mode === 'login' ? '登录' : '创建账号'}</Text>
            {!submitting ? <Ionicons name="arrow-forward" size={19} color={colors.buttonForeground} /> : null}
          </HapticPressable>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerDivider} />
          <View style={styles.footerPrompt}>
            <Text style={styles.footerText}>{mode === 'login' ? '还没有账号？' : '已经有账号？'}</Text>
            <HapticPressable feedback="selection" onPress={() => switchMode(mode === 'login' ? 'register' : 'login')}>
              <Text style={styles.footerAction}>{mode === 'login' ? '去注册' : '去登录'}</Text>
            </HapticPressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (colors: AppColors) => ({
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32, gap: 38 },
  compactContent: { justifyContent: 'flex-start', paddingTop: 28, gap: 24 },
  brand: { alignItems: 'center', gap: 9 },
  compactBrand: { gap: 5 },
  name: { color: colors.brand, fontFamily: fonts.semibold, fontSize: 25, letterSpacing: 0.3, lineHeight: 34 },
  tagline: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  authCard: { backgroundColor: colors.card, borderRadius: 25, gap: 32, maxWidth: 390, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 33, width: '100%' },
  compactCard: { gap: 22, paddingTop: 16, paddingBottom: 24 },
  tabs: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row' },
  tab: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 43, position: 'relative' },
  tabText: { color: colors.textSecondary, fontFamily: fonts.medium, fontSize: 14 },
  selectedTabText: { color: colors.brand, fontFamily: fonts.semibold },
  tabIndicator: { backgroundColor: colors.brand, bottom: -1, height: 2, position: 'absolute', width: 29 },
  form: { gap: 23 },
  registerForm: { gap: 17 },
  field: { gap: 8 },
  label: { color: colors.text, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  inputWrap: { alignItems: 'center', backgroundColor: colors.input, borderRadius: 12, flexDirection: 'row', minHeight: 50, paddingHorizontal: 15 },
  input: { color: colors.text, flex: 1, fontFamily: fonts.regular, fontSize: 15, minHeight: 50, paddingHorizontal: 12, paddingVertical: 0 },
  visibilityButton: { alignItems: 'center', height: 38, justifyContent: 'center', width: 28 },
  error: { color: colors.danger, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, marginTop: -4 },
  submit: { alignItems: 'center', backgroundColor: colors.brand, borderRadius: 28, flexDirection: 'row', gap: 9, justifyContent: 'center', minHeight: 53, marginTop: 0 },
  registerSubmit: { marginTop: 10 },
  submitText: { color: colors.buttonForeground, fontFamily: fonts.medium, fontSize: 14 },
  cardFooter: { gap: 31 },
  footerDivider: { backgroundColor: colors.border, height: StyleSheet.hairlineWidth },
  footerPrompt: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center' },
  footerText: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15 },
  footerAction: { color: colors.brand, fontFamily: fonts.semibold, fontSize: 15 },
  pressed: { opacity: 0.76 },
});
