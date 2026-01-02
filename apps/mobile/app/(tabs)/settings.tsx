import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, List, Button, useTheme, Divider, TextInput, Dialog, Portal, RadioButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, logout } = useAuth();
  
  // Change password
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Delete account
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Fout', 'Vul beide wachtwoorden in');
      return;
    }
    
    if (newPassword.length < 6) {
      Alert.alert('Fout', 'Nieuw wachtwoord moet minimaal 6 tekens zijn');
      return;
    }
    
    setPasswordLoading(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      Alert.alert('Gelukt', 'Wachtwoord is gewijzigd');
      setShowPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
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
    
    Alert.alert(
      'Weet je het zeker?',
      'Dit kan niet ongedaan worden gemaakt. Al je data wordt permanent verwijderd.',
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: async () => {
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
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert(
      'Uitloggen',
      'Weet je zeker dat je wilt uitloggen?',
      [
        { text: 'Annuleren', style: 'cancel' },
        { text: 'Uitloggen', onPress: async () => {
          await logout();
          router.replace('/');
        }}
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={{ fontWeight: 'bold' }}>Instellingen</Text>
      </View>
      
      <ScrollView>
        <List.Section>
          <List.Subheader>Account</List.Subheader>
          
          <List.Item
            title="E-mailadres"
            description={user?.email}
            left={props => <List.Icon {...props} icon="email" />}
          />
          
          <List.Item
            title="Wachtwoord wijzigen"
            left={props => <List.Icon {...props} icon="lock" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setShowPasswordDialog(true)}
          />
        </List.Section>
        
        <Divider />
        
        <List.Section>
          <List.Subheader>Notificaties</List.Subheader>
          
          <List.Item
            title="Push notificaties"
            description="Ontvang meldingen voor matches en berichten"
            left={props => <List.Icon {...props} icon="bell" />}
          />
        </List.Section>
        
        <Divider />
        
        <List.Section>
          <List.Subheader>Privacy & Veiligheid</List.Subheader>
          
          <List.Item
            title="Geblokkeerde gebruikers"
            left={props => <List.Icon {...props} icon="account-cancel" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />
          
          <List.Item
            title="Privacybeleid"
            left={props => <List.Icon {...props} icon="shield-account" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
          />
        </List.Section>
        
        <Divider />
        
        <List.Section>
          <List.Subheader>App</List.Subheader>
          
          <List.Item
            title="Versie"
            description="1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
          />
        </List.Section>
        
        <View style={styles.buttons}>
          <Button 
            mode="outlined" 
            onPress={handleLogout}
            style={styles.button}
          >
            Uitloggen
          </Button>
          
          <Button 
            mode="outlined" 
            onPress={() => setShowDeleteDialog(true)}
            textColor={theme.colors.error}
            style={[styles.button, { borderColor: theme.colors.error }]}
          >
            Account verwijderen
          </Button>
        </View>
      </ScrollView>
      
      {/* Change Password Dialog */}
      <Portal>
        <Dialog visible={showPasswordDialog} onDismiss={() => setShowPasswordDialog(false)}>
          <Dialog.Title>Wachtwoord wijzigen</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Huidig wachtwoord"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              mode="outlined"
              style={{ marginBottom: 16 }}
            />
            <TextInput
              label="Nieuw wachtwoord"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPasswordDialog(false)}>Annuleren</Button>
            <Button onPress={handleChangePassword} loading={passwordLoading}>Wijzigen</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Delete Account Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Account verwijderen</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
              Vul je wachtwoord in om je account permanent te verwijderen.
            </Text>
            <TextInput
              label="Wachtwoord"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Annuleren</Button>
            <Button onPress={handleDeleteAccount} loading={deleteLoading} textColor={theme.colors.error}>
              Verwijderen
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16 },
  buttons: { padding: 16, gap: 12 },
  button: { borderRadius: 12 },
});
