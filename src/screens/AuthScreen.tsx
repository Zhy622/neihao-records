import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { Screen } from '../components/Screen';
import { colors } from '../theme';

type AuthMode = 'login' | 'register';

const getSubmitError = (error: unknown, mode: AuthMode) => {
  if (!(error instanceof ApiError)) {
    return '操作失败，请稍后再试。';
  }

  if (error.status === 0) {
    return error.message;
  }

  if (error.status === 409) {
    return '这个邮箱已经注册，可以直接登录。';
  }

  if (error.status === 401 && mode === 'login') {
    return '邮箱或密码不正确。';
  }

  if (error.status === 400) {
    return '请检查邮箱格式和密码长度。';
  }

  return '服务器暂时无法处理请求，请稍后再试。';
};

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const { height } = useWindowDimensions();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
    setConfirmPassword('');
  };

  const revealFormActions = () => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 250);
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
        await signUp({
          email: normalizedEmail,
          password,
          displayName: displayName.trim() || undefined,
        });
      }
    } catch (submitError) {
      setError(getSubmitError(submitError, mode));
      setSubmitting(false);
    }
  };

  return (
    <Screen
      keyboardAvoiding
      keyboardAvoidingMode="fullscreen"
      scrollViewRef={scrollViewRef}
      contentStyle={[styles.content, height < 720 && styles.compactContent]}
    >
      <View style={styles.brand}>
        <Text style={styles.name}>内耗记录本</Text>
        <Text style={styles.tagline}>把反复想的事留下来，慢慢看清自己的模式。</Text>
      </View>

      <View style={styles.segmentedControl}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mode === 'login' }}
          onPress={() => switchMode('login')}
          style={[styles.segment, mode === 'login' && styles.selectedSegment]}
        >
          <Text style={[styles.segmentText, mode === 'login' && styles.selectedSegmentText]}>登录</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: mode === 'register' }}
          onPress={() => switchMode('register')}
          style={[styles.segment, mode === 'register' && styles.selectedSegment]}
        >
          <Text style={[styles.segmentText, mode === 'register' && styles.selectedSegmentText]}>注册</Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        {mode === 'register' ? (
          <View style={styles.field}>
            <Text style={styles.label}>昵称（可选）</Text>
            <TextInput
              autoComplete="name"
              maxLength={60}
              onChangeText={setDisplayName}
              placeholder="怎么称呼你"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={displayName}
            />
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.label}>邮箱</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="name@example.com"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={email}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>密码</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            onChangeText={setPassword}
            onFocus={mode === 'register' ? revealPasswordField : undefined}
            placeholder="至少 8 位"
            placeholderTextColor={colors.muted}
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>

        {mode === 'register' ? (
          <View style={styles.field}>
            <Text style={styles.label}>确认密码</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="new-password"
              onChangeText={setConfirmPassword}
              onFocus={revealFormActions}
              placeholder="再输入一次密码"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
            />
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          disabled={submitting}
          onPress={() => void submit()}
          style={({ pressed }) => [styles.submit, (pressed || submitting) && styles.pressed]}
        >
          <Text style={styles.submitText}>
            {submitting ? '请稍候…' : mode === 'login' ? '登录' : '创建账号'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', paddingTop: 36, paddingBottom: 120, gap: 28 },
  compactContent: { justifyContent: 'flex-start', paddingTop: 28 },
  brand: { gap: 10 },
  name: { color: colors.text, fontSize: 34, fontWeight: '700' },
  tagline: { color: colors.muted, fontSize: 16, lineHeight: 24, maxWidth: 360 },
  segmentedControl: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  segment: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  selectedSegment: { backgroundColor: colors.surface },
  segmentText: { color: colors.muted, fontSize: 15, fontWeight: '600' },
  selectedSegmentText: { color: colors.text },
  form: { gap: 17 },
  field: { gap: 8 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 16,
  },
  error: { color: colors.danger, lineHeight: 21 },
  submit: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  submitText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
