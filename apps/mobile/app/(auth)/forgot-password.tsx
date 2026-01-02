import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);

  const handleRequestCode = async () => {
    if (!email) {
      setError('Vul je e-mailadres in');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await api.forgotPassword(email);
      if (result.success) {
        setDevCode(result.data.devCode || null);
        setStep('code');
      }
    } catch (e: any) {
      setError(e.message || 'Er ging iets mis');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code || !newPassword) {
      setError('Vul code en nieuw wachtwoord in');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens zijn');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await api.resetPassword(email, code, newPassword);
      if (result.success) {
        setStep('done');
      }
    } catch (e: any) {
      setError(e.message || 'Ongeldige of verlopen code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.content}>
          <IconButton icon="arrow-left" onPress={() => router.back()} style={{ alignSelf: 'flex-start' }} />
          
          {step === 'email' && (
            <>
              <Text variant="headlineMedium" style={styles.title}>Wachtwoord vergeten?</Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
                Vul je e-mailadres in en we sturen je een reset code.
              </Text>
              
              <TextInput
                label="E-mailadres"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                mode="outlined"
                style={styles.input}
              />
              
              {error ? <Text style={{ color: theme.colors.error, marginBottom: 16 }}>{error}</Text> : null}
              
              <Button mode="contained" onPress={handleRequestCode} loading={loading} disabled={loading} style={styles.button}>
                Verstuur code
              </Button>
            </>
          )}
          
          {step === 'code' && (
            <>
              <Text variant="headlineMedium" style={styles.title}>Voer code in</Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
                We hebben een 6-cijferige code gestuurd naar {email}
              </Text>
              
              {devCode && (
                <View style={[styles.devBox, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Text variant="bodySmall">Dev mode - Code: <Text style={{ fontWeight: 'bold' }}>{devCode}</Text></Text>
                </View>
              )}
              
              <TextInput
                label="Reset code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                mode="outlined"
                style={styles.input}
              />
              
              <TextInput
                label="Nieuw wachtwoord"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                mode="outlined"
                style={styles.input}
              />
              
              {error ? <Text style={{ color: theme.colors.error, marginBottom: 16 }}>{error}</Text> : null}
              
              <Button mode="contained" onPress={handleResetPassword} loading={loading} disabled={loading} style={styles.button}>
                Wachtwoord resetten
              </Button>
            </>
          )}
          
          {step === 'done' && (
            <>
              <Text variant="headlineMedium" style={styles.title}>Gelukt! ✅</Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}>
                Je wachtwoord is gewijzigd. Je kunt nu inloggen met je nieuwe wachtwoord.
              </Text>
              
              <Button mode="contained" onPress={() => router.replace('/(auth)/login')} style={styles.button}>
                Naar inloggen
              </Button>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24 },
  title: { fontWeight: 'bold', marginBottom: 8 },
  input: { marginBottom: 16 },
  button: { marginTop: 8, borderRadius: 12 },
  devBox: { padding: 12, borderRadius: 8, marginBottom: 16 },
});
