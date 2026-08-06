import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { HapticPressable } from './HapticPressable';
import { AppColors, fonts, useAppTheme, useThemedStyles } from '../theme';

export type AppAlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
};

type AppAlertState = {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
};

type AppAlertContextValue = {
  alert: (title: string, message?: string, buttons?: AppAlertButton[]) => void;
};

const AppAlertContext = createContext<AppAlertContextValue | undefined>(undefined);

function getAlertTone(alert: AppAlertState | null, colors: AppColors) {
  const hasDestructive = alert?.buttons.some((button) => button.style === 'destructive');
  const title = alert?.title ?? '';

  if (hasDestructive || title.includes('删除') || title.includes('失败')) {
    return { color: colors.danger, icon: 'alert-circle-outline' as const };
  }

  if (title.includes('保存') || title.includes('移除')) {
    return { color: colors.brand, icon: 'checkmark-circle-outline' as const };
  }

  return { color: colors.brand, icon: 'information-circle-outline' as const };
}

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const { colors, isDark } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [activeAlert, setActiveAlert] = useState<AppAlertState | null>(null);
  const tone = getAlertTone(activeAlert, colors);

  const value = useMemo<AppAlertContextValue>(
    () => ({
      alert: (title, message, buttons) => {
        setActiveAlert({
          title,
          message,
          buttons: buttons?.length ? buttons : [{ text: '知道了' }],
        });
      },
    }),
    [],
  );

  const close = (button?: AppAlertButton) => {
    setActiveAlert(null);
    void button?.onPress?.();
  };

  return (
    <AppAlertContext.Provider value={value}>
      {children}
      <Modal animationType="none" transparent visible={Boolean(activeAlert)} onRequestClose={() => close()}>
        {activeAlert ? (
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.overlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
            <BlurView intensity={18} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
            <Animated.View
              entering={FadeIn.duration(160)}
              exiting={FadeOut.duration(100)}
              style={styles.card}
            >
              <View style={[styles.iconWrap, { backgroundColor: `${tone.color}1F` }]}>
                <Ionicons name={tone.icon} size={22} color={tone.color} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{activeAlert.title}</Text>
                {activeAlert.message ? <Text style={styles.message}>{activeAlert.message}</Text> : null}
              </View>
              <View style={styles.actions}>
                {activeAlert.buttons.map((button, index) => {
                  const isCancel = button.style === 'cancel';
                  const isDestructive = button.style === 'destructive';
                  const isPrimary = !isCancel && !isDestructive;
                  return (
                    <HapticPressable
                      key={`${button.text}-${index}`}
                      feedback={isDestructive ? 'light' : 'selection'}
                      style={({ pressed }) => [
                        styles.button,
                        isPrimary && styles.primaryButton,
                        isCancel && styles.cancelButton,
                        isDestructive && styles.destructiveButton,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => close(button)}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          isPrimary && styles.primaryButtonText,
                          isCancel && styles.cancelButtonText,
                          isDestructive && styles.destructiveButtonText,
                        ]}
                      >
                        {button.text}
                      </Text>
                    </HapticPressable>
                  );
                })}
              </View>
            </Animated.View>
          </Animated.View>
        ) : null}
      </Modal>
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  const context = useContext(AppAlertContext);
  if (!context) {
    throw new Error('useAppAlert must be used within AppAlertProvider');
  }

  return context;
}

const createStyles = (colors: AppColors) => ({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.overlay,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    gap: 16,
    padding: 20,
    borderRadius: 28,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: `0 18px 40px ${colors.shadow}`,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  copy: { gap: 8 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  message: { color: colors.textSecondary, fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
  actions: { gap: 10 },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  primaryButton: { backgroundColor: colors.brand },
  cancelButton: { backgroundColor: colors.brandSoft },
  destructiveButton: { backgroundColor: colors.dangerSoft },
  buttonText: { fontFamily: fonts.bold, fontSize: 15 },
  primaryButtonText: { color: colors.buttonForeground },
  cancelButtonText: { color: colors.brand },
  destructiveButtonText: { color: colors.danger },
  pressed: { opacity: 0.78 },
});
