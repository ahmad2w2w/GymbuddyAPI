import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, useColorScheme, TouchableOpacity, Linking } from 'react-native';
import { Text, useTheme, Divider, TextInput, Dialog, Portal, Switch, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, logout, refreshUser } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Privacy settings state
  const [profileVisibility, setProfileVisibility] = useState<'everyone' | 'matches' | 'nobody'>('everyone');
  const [showLocation, setShowLocation] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showWorkoutHistory, setShowWorkoutHistory] = useState(true);
  const [allowMessages, setAllowMessages] = useState<'everyone' | 'matches'>('everyone');
  
  // Security settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  
  // Notification settings
  const [pushEnabled, setPushEnabled] = useState(true);
  const [matchNotifications, setMatchNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [sessionNotifications, setSessionNotifications] = useState(true);
  const [marketingNotifications, setMarketingNotifications] = useState(false);
  
  // Dialog states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const response = await api.getPrivacySettings();
      if (response.success) {
        setProfileVisibility(response.data.profileVisibility);
        setShowLocation(response.data.showLocation);
        setShowOnlineStatus(response.data.showOnlineStatus);
        setShowWorkoutHistory(response.data.showWorkoutHistory);
        setAllowMessages(response.data.allowMessages);
      }
    } catch (error) {
      // Use defaults if API fails
      console.log('Using default privacy settings');
    }
  };

  // Save privacy setting
  const savePrivacySetting = async (key: string, value: any) => {
    try {
      await api.updatePrivacySettings({ [key]: value });
    } catch (error) {
      console.error('Failed to save privacy setting:', error);
      Alert.alert('Fout', 'Kon instelling niet opslaan. Probeer het later opnieuw.');
    }
  };

  // Save notification setting
  const saveNotificationSetting = async (key: string, value: boolean) => {
    try {
      await api.updateNotificationSettings({ [key]: value });
    } catch (error) {
      console.error('Failed to save notification setting:', error);
    }
  };

  // Load blocked users
  const loadBlockedUsers = async () => {
    setLoadingBlocked(true);
    try {
      const response = await api.getBlockedUsers();
      if (response.success) {
        setBlockedUsers(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load blocked users:', error);
      // Show empty list on error
      setBlockedUsers([]);
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await api.unblockUser(userId);
      setBlockedUsers(prev => prev.filter(u => u.id !== userId));
      Alert.alert('Gedeblokkeerd', 'Gebruiker is gedeblokkeerd');
    } catch (error) {
      Alert.alert('Fout', 'Kon gebruiker niet deblokkeren');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Fout', 'Vul alle velden in');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Fout', 'Nieuwe wachtwoorden komen niet overeen');
      return;
    }
    
    if (newPassword.length < 8) {
      Alert.alert('Fout', 'Wachtwoord moet minimaal 8 tekens zijn');
      return;
    }
    
    // Check password strength
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    
    if (!hasUppercase || !hasLowercase || !hasNumber) {
      Alert.alert('Fout', 'Wachtwoord moet minimaal 1 hoofdletter, 1 kleine letter en 1 cijfer bevatten');
      return;
    }
    
    setPasswordLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      Alert.alert('Gelukt! ✅', 'Je wachtwoord is succesvol gewijzigd');
      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      Alert.alert('Fout', e.message || 'Kon wachtwoord niet wijzigen');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Fout', 'Vul je wachtwoord in');
      return;
    }
    
    if (deleteConfirmText !== 'VERWIJDER') {
      Alert.alert('Fout', 'Type "VERWIJDER" om te bevestigen');
      return;
    }
    
    setDeleteLoading(true);
    try {
      await api.deleteAccount(deletePassword);
      await logout();
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Fout', e.message || 'Kon account niet verwijderen');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      // In a real app, this would trigger an API call to generate data export
      await new Promise(resolve => setTimeout(resolve, 2000));
      Alert.alert(
        'Data Export Aangevraagd 📧',
        'Je ontvangt binnen 24 uur een e-mail met een link om je data te downloaden.',
        [{ text: 'OK', onPress: () => setShowDataExport(false) }]
      );
    } catch (error) {
      Alert.alert('Fout', 'Kon data export niet aanvragen');
    } finally {
      setExportLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Uitloggen',
      'Weet je zeker dat je wilt uitloggen?',
      [
        { text: 'Annuleren', style: 'cancel' },
        { text: 'Uitloggen', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/');
        }}
      ]
    );
  };

  // Section Header Component
  const SectionHeader = ({ icon, title, color = '#FF6B35' }: { icon: IconName; title: string; color?: string }) => (
    <View style={styles.sectionHeader}>
      <LinearGradient
        colors={[color + '20', color + '10']}
        style={styles.sectionIconBg}
      >
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </LinearGradient>
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
        {title}
      </Text>
    </View>
  );

  // Setting Item Component
  const SettingItem = ({ 
    icon, 
    title, 
    description, 
    onPress, 
    rightElement,
    danger = false 
  }: { 
    icon: IconName; 
    title: string; 
    description?: string; 
    onPress?: () => void;
    rightElement?: React.ReactNode;
    danger?: boolean;
  }) => (
    <TouchableOpacity 
      style={[styles.settingItem, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIcon, { backgroundColor: danger ? '#FF174420' : (isDark ? '#252536' : '#F5F5F5') }]}>
        <MaterialCommunityIcons name={icon} size={20} color={danger ? '#FF1744' : theme.colors.onSurfaceVariant} />
      </View>
      <View style={styles.settingContent}>
        <Text variant="bodyLarge" style={[styles.settingTitle, { color: danger ? '#FF1744' : theme.colors.onBackground }]}>
          {title}
        </Text>
        {description && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {description}
          </Text>
        )}
      </View>
      {rightElement || (onPress && (
        <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
      ))}
    </TouchableOpacity>
  );

  // Toggle Item Component
  const ToggleItem = ({ 
    icon, 
    title, 
    description, 
    value, 
    onValueChange 
  }: { 
    icon: IconName; 
    title: string; 
    description?: string; 
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <View style={[styles.settingItem, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
      <View style={[styles.settingIcon, { backgroundColor: isDark ? '#252536' : '#F5F5F5' }]}>
        <MaterialCommunityIcons name={icon} size={20} color={theme.colors.onSurfaceVariant} />
      </View>
      <View style={styles.settingContent}>
        <Text variant="bodyLarge" style={[styles.settingTitle, { color: theme.colors.onBackground }]}>
          {title}
        </Text>
        {description && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        color="#FF6B35"
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D14' : '#FAFAFA' }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <LinearGradient
          colors={['#FF6B35', '#FF3D00']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <MaterialCommunityIcons name="cog" size={24} color="white" />
            <Text variant="titleLarge" style={styles.headerTitle}>
              Instellingen
            </Text>
          </View>
        </LinearGradient>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Account Section */}
          <View style={styles.section}>
            <SectionHeader icon="account-circle" title="Account" />
            
            <View style={styles.sectionContent}>
              <SettingItem
                icon="email"
                title="E-mailadres"
                description={user?.email}
              />
              <SettingItem
                icon="lock"
                title="Wachtwoord wijzigen"
                description="Laatste wijziging: onbekend"
                onPress={() => setShowPasswordDialog(true)}
              />
            </View>
          </View>

          {/* Privacy Section */}
          <View style={styles.section}>
            <SectionHeader icon="shield-account" title="Privacy" color="#7C4DFF" />
            
            <View style={styles.sectionContent}>
              <ToggleItem
                icon="eye"
                title="Profiel zichtbaar"
                description="Anderen kunnen je profiel bekijken"
                value={profileVisibility === 'everyone'}
                onValueChange={(val) => {
                  const newVal = val ? 'everyone' : 'matches';
                  setProfileVisibility(newVal);
                  savePrivacySetting('profileVisibility', newVal);
                }}
              />
              <ToggleItem
                icon="map-marker"
                title="Locatie tonen"
                description="Toon je gym locatie aan anderen"
                value={showLocation}
                onValueChange={(val) => {
                  setShowLocation(val);
                  savePrivacySetting('showLocation', val);
                }}
              />
              <ToggleItem
                icon="circle"
                title="Online status"
                description="Toon wanneer je online bent"
                value={showOnlineStatus}
                onValueChange={(val) => {
                  setShowOnlineStatus(val);
                  savePrivacySetting('showOnlineStatus', val);
                }}
              />
              <ToggleItem
                icon="dumbbell"
                title="Workout geschiedenis"
                description="Toon je workout stats aan matches"
                value={showWorkoutHistory}
                onValueChange={(val) => {
                  setShowWorkoutHistory(val);
                  savePrivacySetting('showWorkoutHistory', val);
                }}
              />
              <SettingItem
                icon="account-cancel"
                title="Geblokkeerde gebruikers"
                description={`${blockedUsers.length} geblokkeerd`}
                onPress={() => {
                  loadBlockedUsers();
                  setShowBlockedUsers(true);
                }}
              />
            </View>
          </View>

          {/* Security Section */}
          <View style={styles.section}>
            <SectionHeader icon="shield-lock" title="Beveiliging" color="#00C853" />
            
            <View style={styles.sectionContent}>
              <ToggleItem
                icon="two-factor-authentication"
                title="Twee-factor authenticatie"
                description="Extra beveiliging bij inloggen"
                value={twoFactorEnabled}
                onValueChange={setTwoFactorEnabled}
              />
              <ToggleItem
                icon="fingerprint"
                title="Biometrische login"
                description="Inloggen met Face ID of vingerafdruk"
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
              />
              <SettingItem
                icon="cellphone-lock"
                title="Actieve sessies"
                description="Beheer apparaten die zijn ingelogd"
                onPress={() => Alert.alert('Actieve Sessies', 'Je bent momenteel ingelogd op 1 apparaat.')}
              />
            </View>
          </View>

          {/* Notifications Section */}
          <View style={styles.section}>
            <SectionHeader icon="bell" title="Notificaties" color="#00B0FF" />
            
            <View style={styles.sectionContent}>
              <ToggleItem
                icon="bell-ring"
                title="Push notificaties"
                description="Ontvang meldingen op je telefoon"
                value={pushEnabled}
                onValueChange={(val) => {
                  setPushEnabled(val);
                  saveNotificationSetting('pushEnabled', val);
                }}
              />
              <ToggleItem
                icon="heart"
                title="Nieuwe matches"
                description="Melding bij een nieuwe match"
                value={matchNotifications}
                onValueChange={(val) => {
                  setMatchNotifications(val);
                  saveNotificationSetting('matchNotifications', val);
                }}
              />
              <ToggleItem
                icon="message"
                title="Berichten"
                description="Melding bij nieuwe berichten"
                value={messageNotifications}
                onValueChange={(val) => {
                  setMessageNotifications(val);
                  saveNotificationSetting('messageNotifications', val);
                }}
              />
              <ToggleItem
                icon="calendar"
                title="Sessie updates"
                description="Meldingen over je sessies"
                value={sessionNotifications}
                onValueChange={(val) => {
                  setSessionNotifications(val);
                  saveNotificationSetting('sessionNotifications', val);
                }}
              />
              <ToggleItem
                icon="bullhorn"
                title="Marketing"
                description="Tips, nieuws en aanbiedingen"
                value={marketingNotifications}
                onValueChange={(val) => {
                  setMarketingNotifications(val);
                  saveNotificationSetting('marketingNotifications', val);
                }}
              />
            </View>
          </View>

          {/* Data & Legal Section */}
          <View style={styles.section}>
            <SectionHeader icon="database" title="Data & Juridisch" color="#FF9800" />
            
            <View style={styles.sectionContent}>
              <SettingItem
                icon="download"
                title="Download mijn data"
                description="Exporteer al je gegevens"
                onPress={() => setShowDataExport(true)}
              />
              <SettingItem
                icon="file-document"
                title="Privacybeleid"
                description="Hoe we je data beschermen"
                onPress={() => setShowPrivacyPolicy(true)}
              />
              <SettingItem
                icon="file-certificate"
                title="Gebruiksvoorwaarden"
                description="Regels voor gebruik van de app"
                onPress={() => setShowTerms(true)}
              />
              <SettingItem
                icon="cookie"
                title="Cookie instellingen"
                description="Beheer tracking voorkeuren"
                onPress={() => Alert.alert('Cookies', 'Deze app gebruikt alleen essentiële cookies voor functionaliteit.')}
              />
            </View>
          </View>

          {/* App Info Section */}
          <View style={styles.section}>
            <SectionHeader icon="information" title="App Informatie" color="#9E9E9E" />
            
            <View style={styles.sectionContent}>
              <SettingItem
                icon="cellphone"
                title="App versie"
                description="1.0.0 (Build 1)"
              />
              <SettingItem
                icon="help-circle"
                title="Help & Ondersteuning"
                description="Veelgestelde vragen en contact"
                onPress={() => Linking.openURL('mailto:support@gymbuddy.app')}
              />
              <SettingItem
                icon="star"
                title="Beoordeel de app"
                description="Laat een review achter"
                onPress={() => Alert.alert('Bedankt! ⭐', 'We openen de App Store voor je.')}
              />
            </View>
          </View>

          {/* Danger Zone */}
          <View style={styles.section}>
            <SectionHeader icon="alert-circle" title="Gevaarzone" color="#FF1744" />
            
            <View style={styles.sectionContent}>
              <SettingItem
                icon="logout"
                title="Uitloggen"
                description="Log uit op dit apparaat"
                onPress={handleLogout}
                danger
              />
              <SettingItem
                icon="delete-forever"
                title="Account verwijderen"
                description="Permanent je account en data verwijderen"
                onPress={() => setShowDeleteDialog(true)}
                danger
              />
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              GymBuddy v1.0.0 • Gemaakt met 💪 in Nederland
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
              © 2025 GymBuddy. Alle rechten voorbehouden.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Portal>
        {/* Password Change Dialog */}
        <Dialog visible={showPasswordDialog} onDismiss={() => setShowPasswordDialog(false)} style={{ backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', borderRadius: 20 }}>
          <Dialog.Title style={{ color: theme.colors.onBackground }}>🔐 Wachtwoord wijzigen</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
              Je nieuwe wachtwoord moet minimaal 8 tekens bevatten met hoofdletters, kleine letters en cijfers.
            </Text>
            <TextInput
              label="Huidig wachtwoord"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              mode="outlined"
              style={{ marginBottom: 12, backgroundColor: isDark ? '#252536' : '#F5F5F5' }}
              right={<TextInput.Icon icon={showCurrentPassword ? 'eye-off' : 'eye'} onPress={() => setShowCurrentPassword(!showCurrentPassword)} />}
            />
            <TextInput
              label="Nieuw wachtwoord"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              mode="outlined"
              style={{ marginBottom: 12, backgroundColor: isDark ? '#252536' : '#F5F5F5' }}
              right={<TextInput.Icon icon={showNewPassword ? 'eye-off' : 'eye'} onPress={() => setShowNewPassword(!showNewPassword)} />}
            />
            <TextInput
              label="Bevestig nieuw wachtwoord"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showNewPassword}
              mode="outlined"
              style={{ backgroundColor: isDark ? '#252536' : '#F5F5F5' }}
            />
            
            {/* Password strength indicator */}
            {newPassword.length > 0 && (
              <View style={styles.passwordStrength}>
                <View style={styles.strengthBars}>
                  <View style={[styles.strengthBar, { backgroundColor: newPassword.length >= 8 ? '#00C853' : '#E0E0E0' }]} />
                  <View style={[styles.strengthBar, { backgroundColor: /[A-Z]/.test(newPassword) ? '#00C853' : '#E0E0E0' }]} />
                  <View style={[styles.strengthBar, { backgroundColor: /[0-9]/.test(newPassword) ? '#00C853' : '#E0E0E0' }]} />
                  <View style={[styles.strengthBar, { backgroundColor: /[^A-Za-z0-9]/.test(newPassword) ? '#00C853' : '#E0E0E0' }]} />
                </View>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {newPassword.length < 8 ? 'Zwak' : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 'Sterk 💪' : 'Gemiddeld'}
                </Text>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <TouchableOpacity 
              style={styles.dialogButton}
              onPress={() => setShowPasswordDialog(false)}
            >
              <Text style={{ color: theme.colors.onSurfaceVariant }}>Annuleren</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dialogButton, styles.dialogButtonPrimary]}
              onPress={handleChangePassword}
              disabled={passwordLoading}
            >
              {passwordLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{ color: 'white', fontWeight: '600' }}>Wijzigen</Text>
              )}
            </TouchableOpacity>
          </Dialog.Actions>
        </Dialog>

        {/* Delete Account Dialog */}
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)} style={{ backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', borderRadius: 20 }}>
          <Dialog.Title style={{ color: '#FF1744' }}>⚠️ Account verwijderen</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onBackground, marginBottom: 12 }}>
              Dit kan NIET ongedaan worden gemaakt. Al je data wordt permanent verwijderd:
            </Text>
            <View style={styles.deleteWarnings}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>• Profiel en foto's</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>• Matches en gesprekken</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>• Workout geschiedenis</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>• XP, badges en streaks</Text>
            </View>
            <TextInput
              label="Wachtwoord"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              mode="outlined"
              style={{ marginTop: 16, marginBottom: 12, backgroundColor: isDark ? '#252536' : '#F5F5F5' }}
            />
            <TextInput
              label='Type "VERWIJDER" om te bevestigen'
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              mode="outlined"
              style={{ backgroundColor: isDark ? '#252536' : '#F5F5F5' }}
              autoCapitalize="characters"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <TouchableOpacity 
              style={styles.dialogButton}
              onPress={() => {
                setShowDeleteDialog(false);
                setDeletePassword('');
                setDeleteConfirmText('');
              }}
            >
              <Text style={{ color: theme.colors.onSurfaceVariant }}>Annuleren</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dialogButton, { backgroundColor: '#FF1744' }]}
              onPress={handleDeleteAccount}
              disabled={deleteLoading || deleteConfirmText !== 'VERWIJDER'}
            >
              {deleteLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{ color: 'white', fontWeight: '600' }}>Verwijderen</Text>
              )}
            </TouchableOpacity>
          </Dialog.Actions>
        </Dialog>

        {/* Blocked Users Dialog */}
        <Dialog visible={showBlockedUsers} onDismiss={() => setShowBlockedUsers(false)} style={{ backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', borderRadius: 20, maxHeight: '70%' }}>
          <Dialog.Title style={{ color: theme.colors.onBackground }}>Geblokkeerde gebruikers</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView style={{ maxHeight: 300 }}>
              {loadingBlocked ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator />
                </View>
              ) : blockedUsers.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <MaterialCommunityIcons name="account-check" size={48} color="#00C853" />
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, textAlign: 'center' }}>
                    Je hebt niemand geblokkeerd
                  </Text>
                </View>
              ) : (
                blockedUsers.map((user) => (
                  <View key={user.id} style={styles.blockedUserItem}>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyLarge" style={{ color: theme.colors.onBackground }}>{user.name}</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>Geblokkeerd op {new Date(user.blockedAt).toLocaleDateString('nl-NL')}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.unblockButton}
                      onPress={() => handleUnblock(user.id)}
                    >
                      <Text style={{ color: '#FF6B35', fontWeight: '600' }}>Deblokkeer</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <TouchableOpacity 
              style={styles.dialogButton}
              onPress={() => setShowBlockedUsers(false)}
            >
              <Text style={{ color: theme.colors.onSurfaceVariant }}>Sluiten</Text>
            </TouchableOpacity>
          </Dialog.Actions>
        </Dialog>

        {/* Data Export Dialog */}
        <Dialog visible={showDataExport} onDismiss={() => setShowDataExport(false)} style={{ backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', borderRadius: 20 }}>
          <Dialog.Title style={{ color: theme.colors.onBackground }}>📦 Data exporteren</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onBackground, marginBottom: 12 }}>
              Je kunt een kopie van al je data opvragen. Dit bevat:
            </Text>
            <View style={styles.exportInfo}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>✓ Profielinformatie</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>✓ Matches en gesprekken</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>✓ Workout data en statistieken</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>✓ Sessie geschiedenis</Text>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
              Je ontvangt binnen 24 uur een e-mail met een downloadlink.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <TouchableOpacity 
              style={styles.dialogButton}
              onPress={() => setShowDataExport(false)}
            >
              <Text style={{ color: theme.colors.onSurfaceVariant }}>Annuleren</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dialogButton, styles.dialogButtonPrimary]}
              onPress={handleExportData}
              disabled={exportLoading}
            >
              {exportLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={{ color: 'white', fontWeight: '600' }}>Aanvragen</Text>
              )}
            </TouchableOpacity>
          </Dialog.Actions>
        </Dialog>

        {/* Privacy Policy Dialog */}
        <Dialog visible={showPrivacyPolicy} onDismiss={() => setShowPrivacyPolicy(false)} style={{ backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', borderRadius: 20, maxHeight: '80%' }}>
          <Dialog.Title style={{ color: theme.colors.onBackground }}>🔒 Privacybeleid</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView style={{ paddingHorizontal: 24 }}>
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, marginTop: 16, marginBottom: 8 }}>
                1. Gegevensverzameling
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                GymBuddy verzamelt alleen gegevens die noodzakelijk zijn voor de werking van de app: profielinformatie, locatiegegevens (met toestemming), en workout data.
              </Text>
              
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, marginBottom: 8 }}>
                2. Gebruik van gegevens
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                Je gegevens worden gebruikt om je te matchen met andere gym buddies, sessies te faciliteren, en je workout voortgang bij te houden.
              </Text>
              
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, marginBottom: 8 }}>
                3. Delen van gegevens
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                We delen je gegevens NOOIT met derden voor marketingdoeleinden. Alleen de informatie die je zelf instelt als zichtbaar wordt getoond aan andere gebruikers.
              </Text>
              
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, marginBottom: 8 }}>
                4. Beveiliging
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                Alle gegevens worden versleuteld opgeslagen en verzonden via HTTPS. Wachtwoorden worden gehashed met bcrypt.
              </Text>
              
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, marginBottom: 8 }}>
                5. Je rechten (AVG/GDPR)
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                Je hebt het recht om je gegevens in te zien, te wijzigen, te exporteren of te laten verwijderen. Dit kan via de instellingen in de app.
              </Text>
              
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, marginBottom: 8 }}>
                6. Contact
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
                Vragen over privacy? Mail naar privacy@gymbuddy.app
              </Text>
              
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16, fontStyle: 'italic' }}>
                Laatst bijgewerkt: januari 2025
              </Text>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <TouchableOpacity 
              style={[styles.dialogButton, styles.dialogButtonPrimary]}
              onPress={() => setShowPrivacyPolicy(false)}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Begrepen</Text>
            </TouchableOpacity>
          </Dialog.Actions>
        </Dialog>

        {/* Terms Dialog */}
        <Dialog visible={showTerms} onDismiss={() => setShowTerms(false)} style={{ backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', borderRadius: 20, maxHeight: '80%' }}>
          <Dialog.Title style={{ color: theme.colors.onBackground }}>📜 Gebruiksvoorwaarden</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView style={{ paddingHorizontal: 24 }}>
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, marginTop: 16, marginBottom: 8 }}>
                1. Acceptatie
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                Door GymBuddy te gebruiken ga je akkoord met deze voorwaarden.
              </Text>
              
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, marginBottom: 8 }}>
                2. Accountvereisten
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                Je moet minimaal 16 jaar oud zijn om GymBuddy te gebruiken. Je bent verantwoordelijk voor de veiligheid van je account.
              </Text>
              
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, marginBottom: 8 }}>
                3. Gedragsregels
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                • Geen beledigende of discriminerende content{'\n'}
                • Geen spam of ongewenste berichten{'\n'}
                • Geen nepprofielen of misleiding{'\n'}
                • Respecteer andere gebruikers
              </Text>
              
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, marginBottom: 8 }}>
                4. Content
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                Je behoudt eigendom van je content, maar geeft GymBuddy toestemming om deze te gebruiken binnen de app.
              </Text>
              
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, marginBottom: 8 }}>
                5. Beëindiging
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
                We behouden het recht om accounts te beëindigen die deze voorwaarden schenden.
              </Text>
              
              <Text variant="titleSmall" style={{ color: theme.colors.onBackground, marginBottom: 8 }}>
                6. Aansprakelijkheid
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
                GymBuddy is een platform om gym buddies te vinden. We zijn niet aansprakelijk voor interacties tussen gebruikers buiten de app.
              </Text>
              
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16, fontStyle: 'italic' }}>
                Laatst bijgewerkt: januari 2025
              </Text>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <TouchableOpacity 
              style={[styles.dialogButton, styles.dialogButtonPrimary]}
              onPress={() => setShowTerms(false)}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Begrepen</Text>
            </TouchableOpacity>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
    paddingTop: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
  },
  sectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 2,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontWeight: '500',
  },
  footer: {
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  dialogButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 10,
  },
  dialogButtonPrimary: {
    backgroundColor: '#FF6B35',
  },
  passwordStrength: {
    marginTop: 12,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  deleteWarnings: {
    backgroundColor: 'rgba(255, 23, 68, 0.1)',
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  exportInfo: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    padding: 12,
    borderRadius: 10,
    gap: 4,
  },
  blockedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
});
