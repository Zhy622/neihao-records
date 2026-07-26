import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../auth/AuthProvider';
import {
  AvatarMimeType,
  getRemoteAccountProfile,
  RemoteAccountProfile,
  updateRemoteAccountProfile,
  UpdateAccountProfileInput,
} from '../api/account-profile';
import { useAppAlert } from '../components/AppAlert';
import { HapticPressable } from '../components/HapticPressable';
import { Screen } from '../components/Screen';
import { AccountProfile, getAccountProfile, upsertAccountProfile } from '../database/database';
import { fonts } from '../theme';

type Counts = { recordDays: number; notes: number; reviews: number };
type ProfileDraft = Pick<AccountProfile, 'displayName' | 'signature' | 'avatarUri' | 'avatarMimeType'>;

const maxAvatarBytes = 1024 * 1024;

function avatarMimeTypeFromUri(uri: string | null): AvatarMimeType | null {
  if (!uri) {
    return null;
  }

  const dataUrlMimeType = uri.match(/^data:(image\/(?:jpeg|png|webp|heic));base64,/i)?.[1]?.toLowerCase();
  if (dataUrlMimeType === 'image/jpeg' || dataUrlMimeType === 'image/png' || dataUrlMimeType === 'image/webp' || dataUrlMimeType === 'image/heic') {
    return dataUrlMimeType;
  }

  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic') return 'image/heic';
  return null;
}

function isAvatarMimeType(value: string | null): value is AvatarMimeType {
  return value === 'image/jpeg' || value === 'image/png' || value === 'image/webp' || value === 'image/heic';
}

function toLocalProfile(remote: RemoteAccountProfile, fallbackName: string): ProfileDraft {
  return {
    displayName: remote.displayName ?? fallbackName,
    signature: remote.signature,
    avatarUri: remote.avatarDataUrl,
    avatarMimeType: avatarMimeTypeFromUri(remote.avatarDataUrl),
  };
}

async function toRemoteProfileInput(profile: ProfileDraft): Promise<UpdateAccountProfileInput> {
  const input: UpdateAccountProfileInput = {
    displayName: profile.displayName.trim(),
    signature: profile.signature.trim(),
  };

  if (!profile.avatarUri) {
    return input;
  }

  const dataUrl = profile.avatarUri.match(/^data:(image\/(?:jpeg|png|webp|heic));base64,([A-Za-z0-9+/=]+)$/i);
  if (dataUrl) {
    return { ...input, avatarMimeType: dataUrl[1].toLowerCase() as AvatarMimeType, avatarBase64: dataUrl[2] };
  }

  const file = new File(profile.avatarUri);
  if (file.size > maxAvatarBytes) {
    throw new Error('avatar-too-large');
  }

  const avatarMimeType = isAvatarMimeType(profile.avatarMimeType)
    ? profile.avatarMimeType
    : avatarMimeTypeFromUri(profile.avatarUri);
  if (!avatarMimeType) {
    throw new Error('avatar-unsupported');
  }

  return { ...input, avatarMimeType, avatarBase64: await file.base64() };
}

function SettingsRow({
  icon,
  iconStyle,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconStyle: 'exportIcon' | 'aboutIcon';
  label: string;
  onPress: () => void;
}) {
  return (
    <HapticPressable accessibilityRole="button" style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]} onPress={onPress}>
      <View style={[styles.settingIcon, styles[iconStyle]]}>
        <Ionicons name={icon} size={21} color="#466349" />
      </View>
      <Text style={styles.settingLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={19} color="#B3BBB3" />
    </HapticPressable>
  );
}

export function AccountScreen() {
  const db = useSQLiteContext();
  const { session, signOut } = useAuth();
  const { alert } = useAppAlert();
  const [counts, setCounts] = useState<Counts>({ recordDays: 0, notes: 0, reviews: 0 });
  const [profile, setProfile] = useState<ProfileDraft | null>(null);
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!session) {
      return;
    }

    const [recordDays, notes, reviews, savedProfile] = await Promise.all([
      db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(DISTINCT substr(createdAt, 1, 10)) AS count FROM records WHERE ownerUserId = ? AND syncStatus != 'pending_delete'",
        session.user.id,
      ),
      db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM notes WHERE ownerUserId = ? AND syncStatus != 'pending_delete'",
        session.user.id,
      ),
      db.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM people_observations WHERE ownerUserId = ? AND syncStatus != 'pending_delete'",
        session.user.id,
      ),
      getAccountProfile(db, session.user.id),
    ]);

    setCounts({
      recordDays: recordDays?.count ?? 0,
      notes: notes?.count ?? 0,
      reviews: reviews?.count ?? 0,
    });
    const fallbackName = session.user.displayName || session.user.email.split('@')[0] || '我';
    let nextProfile = savedProfile;
    try {
      let remoteProfile = await getRemoteAccountProfile();
      if (savedProfile && new Date(savedProfile.updatedAt) > new Date(remoteProfile.updatedAt)) {
        remoteProfile = await updateRemoteAccountProfile(await toRemoteProfileInput(savedProfile));
      }
      nextProfile = await upsertAccountProfile(
        db,
        session.user.id,
        { ...toLocalProfile(remoteProfile, fallbackName), updatedAt: remoteProfile.updatedAt },
      );
    } catch {
      // The local profile remains usable offline and will retry on the next visit.
    }
    setProfile(nextProfile);
  }, [db, session]);

  useFocusEffect(useCallback(() => { void loadAccount(); }, [loadAccount]));

  const defaultName = session?.user.displayName || session?.user.email.split('@')[0] || '我';
  const displayName = profile?.displayName || defaultName;
  const signature = profile?.signature || '“在记录中遇见更好的自己”';
  const avatarUri = profile?.avatarUri ?? null;
  const initial = displayName.trim().slice(0, 1).toUpperCase() || '我';

  const openProfileEditor = () => {
    setDraft({
      displayName,
      signature: profile?.signature ?? '',
      avatarUri,
      avatarMimeType: profile?.avatarMimeType ?? avatarMimeTypeFromUri(avatarUri),
    });
    setEditingProfile(true);
  };

  const chooseAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('需要照片权限', '请允许访问相册后再选择头像。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setDraft((current) => current ? {
        ...current,
        avatarUri: asset.uri,
        avatarMimeType: avatarMimeTypeFromUri(asset.mimeType ? `avatar.${asset.mimeType.split('/')[1]}` : asset.uri),
      } : current);
    }
  };

  const saveProfile = async () => {
    if (!session || !draft) {
      return;
    }
    if (!draft.displayName.trim()) {
      alert('请输入昵称', '昵称不能为空。');
      return;
    }

    try {
      setSavingProfile(true);
      let avatarUri = draft.avatarUri;
      if (avatarUri && avatarUri !== profile?.avatarUri) {
        const source = new File(avatarUri);
        const destination = new File(
          Paths.document,
          `profile-${session.user.id.replace(/[^a-zA-Z0-9_-]/g, '')}${source.extension || '.jpg'}`,
        );
        if (destination.exists) {
          destination.delete();
        }
        await source.copy(destination);
        avatarUri = destination.uri;

        if (profile?.avatarUri?.startsWith(Paths.document.uri)) {
          const previous = new File(profile.avatarUri);
          if (previous.exists && previous.uri !== destination.uri) {
            previous.delete();
          }
        }
      }

      const localProfile = await upsertAccountProfile(db, session.user.id, { ...draft, avatarUri });
      if (!localProfile) {
        throw new Error('profile-not-saved');
      }

      let savedProfile = localProfile;
      try {
        const remoteProfile = await updateRemoteAccountProfile(await toRemoteProfileInput(localProfile));
        savedProfile = await upsertAccountProfile(
          db,
          session.user.id,
          { ...toLocalProfile(remoteProfile, localProfile.displayName), updatedAt: remoteProfile.updatedAt },
        ) ?? localProfile;
      } catch (error) {
        const message = error instanceof Error && error.message === 'avatar-too-large'
          ? '头像请压缩到 1 MB 以内后再试。'
          : '资料已保存到本机，联网后打开“我的”页面会自动同步。';
        alert('暂未同步到云端', message);
      }
      setProfile(savedProfile);
      setEditingProfile(false);
    } catch {
      alert('保存失败', '资料暂时没有保存，请稍后重试。');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  return (
    <Screen backgroundColor="#F7FAF8" contentStyle={styles.content}>
      <View style={styles.profile}>
        <HapticPressable accessibilityRole="button" accessibilityLabel="编辑个人资料" style={styles.avatarPressable} onPress={openProfileEditor}>
          <View style={styles.avatar}>
            {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{initial}</Text>}
            <View style={styles.editAvatarIcon}>
              <Ionicons name="create" size={14} color="#FFFFFF" />
            </View>
          </View>
        </HapticPressable>
        <Text selectable style={styles.name}>{displayName}</Text>
        <Text selectable style={styles.motto}>{signature}</Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{counts.recordDays}</Text>
          <Text style={styles.statLabel}>记录天数</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{counts.notes}</Text>
          <Text style={styles.statLabel}>随记篇数</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{counts.reviews}</Text>
          <Text style={styles.statLabel}>复盘次数</Text>
        </View>
      </View>

      <View style={styles.settingsCard}>
        <SettingsRow
          icon="share-outline"
          iconStyle="exportIcon"
          label="数据导出"
          onPress={() => alert('数据导出', '当前版本会在本机保存记录并自动同步；文件导出将在后续版本提供。')}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="information-circle-outline"
          iconStyle="aboutIcon"
          label="关于小记"
          onPress={() => alert('关于小记', '内耗记录本 v1.0.0\n记录、随记与观照，陪你看见自己。')}
        />
      </View>

      <HapticPressable
        disabled={signingOut}
        onPress={() => void handleSignOut()}
        style={({ pressed }) => [styles.signOut, (pressed || signingOut) && styles.pressed]}
      >
        <Text style={styles.signOutText}>{signingOut ? '正在退出…' : '退出登录'}</Text>
      </HapticPressable>

      <Modal animationType="fade" transparent visible={editingProfile} onRequestClose={() => setEditingProfile(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.editorCard}>
            <View style={styles.editorHeader}>
              <Text style={styles.editorTitle}>编辑个人资料</Text>
              <HapticPressable accessibilityRole="button" accessibilityLabel="关闭编辑" style={styles.closeButton} onPress={() => setEditingProfile(false)}>
                <Ionicons name="close" size={20} color="#5D655E" />
              </HapticPressable>
            </View>

            <HapticPressable accessibilityRole="button" style={styles.editorAvatarButton} onPress={() => void chooseAvatar()}>
              <View style={styles.editorAvatar}>
                {draft?.avatarUri ? <Image source={{ uri: draft.avatarUri }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{initial}</Text>}
                <View style={styles.editorAvatarIcon}>
                  <Ionicons name="image-outline" size={15} color="#FFFFFF" />
                </View>
              </View>
              <Text style={styles.changeAvatarText}>从手机相册选择头像</Text>
            </HapticPressable>

            <View style={styles.editorField}>
              <Text style={styles.editorLabel}>昵称</Text>
              <TextInput
                value={draft?.displayName ?? ''}
                onChangeText={(displayName) => setDraft((current) => current ? { ...current, displayName } : current)}
                maxLength={24}
                placeholder="输入你的昵称"
                placeholderTextColor="#98A098"
                style={styles.editorInput}
              />
            </View>
            <View style={styles.editorField}>
              <Text style={styles.editorLabel}>签名</Text>
              <TextInput
                value={draft?.signature ?? ''}
                onChangeText={(signature) => setDraft((current) => current ? { ...current, signature } : current)}
                maxLength={48}
                multiline
                placeholder="写下一句想对自己说的话"
                placeholderTextColor="#98A098"
                style={[styles.editorInput, styles.signatureInput]}
              />
            </View>

            <View style={styles.editorActions}>
              <HapticPressable disabled={savingProfile} style={({ pressed }) => [styles.cancelButton, (pressed || savingProfile) && styles.pressed]} onPress={() => setEditingProfile(false)}>
                <Text style={styles.cancelButtonText}>取消</Text>
              </HapticPressable>
              <HapticPressable disabled={savingProfile} style={({ pressed }) => [styles.saveButton, (pressed || savingProfile) && styles.pressed]} onPress={() => void saveProfile()}>
                <Text style={styles.saveButtonText}>{savingProfile ? '保存中…' : '保存资料'}</Text>
              </HapticPressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 34, paddingHorizontal: 28, paddingBottom: 130, gap: 32 },
  profile: { alignItems: 'center', gap: 10 },
  avatarPressable: { borderRadius: 50 },
  avatar: { alignItems: 'center', backgroundColor: '#DDE9DD', borderColor: '#FFFFFF', borderRadius: 50, borderWidth: 4, height: 100, justifyContent: 'center', overflow: 'visible', width: 100 },
  avatarImage: { borderRadius: 46, height: '100%', width: '100%' },
  avatarText: { color: '#466349', fontFamily: fonts.medium, fontSize: 34 },
  editAvatarIcon: { alignItems: 'center', backgroundColor: '#466349', borderColor: '#FFFFFF', borderRadius: 16, borderWidth: 3, bottom: -4, height: 32, justifyContent: 'center', position: 'absolute', right: -4, width: 32 },
  name: { color: '#1E241F', fontFamily: fonts.medium, fontSize: 24, lineHeight: 30 },
  motto: { color: '#596159', fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  stats: { flexDirection: 'row', gap: 12 },
  statCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, flex: 1, gap: 5, minHeight: 82, justifyContent: 'center', paddingVertical: 12 },
  statValue: { color: '#466349', fontFamily: fonts.medium, fontSize: 17, fontVariant: ['tabular-nums'] },
  statLabel: { color: '#596159', fontFamily: fonts.regular, fontSize: 12 },
  settingsCard: { backgroundColor: '#FFFFFF', borderRadius: 28, overflow: 'hidden' },
  settingsRow: { alignItems: 'center', flexDirection: 'row', gap: 14, minHeight: 82, paddingHorizontal: 20 },
  settingIcon: { alignItems: 'center', borderRadius: 12, height: 40, justifyContent: 'center', width: 40 },
  exportIcon: { backgroundColor: '#F0F2F0' },
  aboutIcon: { backgroundColor: '#F0F2F0' },
  settingLabel: { color: '#313832', flex: 1, fontFamily: fonts.medium, fontSize: 16 },
  divider: { backgroundColor: '#EEF1EE', height: StyleSheet.hairlineWidth, marginLeft: 74 },
  signOut: { alignItems: 'center', backgroundColor: '#E9EDEC', borderRadius: 28, justifyContent: 'center', minHeight: 56 },
  signOutText: { color: '#5A625B', fontFamily: fonts.medium, fontSize: 15 },
  modalOverlay: { alignItems: 'center', backgroundColor: 'rgba(35, 45, 37, 0.28)', flex: 1, justifyContent: 'center', padding: 20 },
  editorCard: { backgroundColor: '#F7FAF8', borderRadius: 28, gap: 20, maxWidth: 420, padding: 22, width: '100%' },
  editorHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  editorTitle: { color: '#252B26', fontFamily: fonts.medium, fontSize: 19 },
  closeButton: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  editorAvatarButton: { alignItems: 'center', gap: 8 },
  editorAvatar: { alignItems: 'center', backgroundColor: '#DDE9DD', borderColor: '#FFFFFF', borderRadius: 42, borderWidth: 3, height: 84, justifyContent: 'center', overflow: 'visible', width: 84 },
  editorAvatarIcon: { alignItems: 'center', backgroundColor: '#466349', borderColor: '#FFFFFF', borderRadius: 13, borderWidth: 2, bottom: -3, height: 26, justifyContent: 'center', position: 'absolute', right: -3, width: 26 },
  changeAvatarText: { color: '#466349', fontFamily: fonts.medium, fontSize: 13 },
  editorField: { gap: 8 },
  editorLabel: { color: '#596159', fontFamily: fonts.medium, fontSize: 14 },
  editorInput: { backgroundColor: '#FFFFFF', borderRadius: 18, color: '#252B26', fontFamily: fonts.regular, fontSize: 16, minHeight: 52, paddingHorizontal: 16, paddingVertical: 13 },
  signatureInput: { minHeight: 82, textAlignVertical: 'top' },
  editorActions: { flexDirection: 'row', gap: 10 },
  cancelButton: { alignItems: 'center', backgroundColor: '#E9EDEC', borderRadius: 22, flex: 1, justifyContent: 'center', minHeight: 48 },
  cancelButtonText: { color: '#5A625B', fontFamily: fonts.medium, fontSize: 14 },
  saveButton: { alignItems: 'center', backgroundColor: '#466349', borderRadius: 22, flex: 1, justifyContent: 'center', minHeight: 48 },
  saveButtonText: { color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 14 },
  pressed: { opacity: 0.72 },
});
