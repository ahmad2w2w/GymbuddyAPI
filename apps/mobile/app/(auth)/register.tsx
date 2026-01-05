import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, useColorScheme } from 'react-native';
import { Text, TextInput, Button, useTheme, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { register } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Vul alle velden in');
      return;
    }

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }

    if (password.length < 6) {
      setError('Wachtwoord moet minimaal 6 tekens zijn');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(email, password, name);
      // Navigate to email verification screen
      router.replace({
        pathname: '/(auth)/verify-email',
        params: { email: email.toLowerCase() }
      });
    } catch (err: any) {
      setError(err.message || 'Registratie mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D14' : '#FAFAFA' }]}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Back Button */}
            <IconButton
              icon="arrow-left"
              onPress={() => router.back()}
              style={styles.backButton}
              iconColor={theme.colors.onBackground}
            />

            {/* Header */}
            <View style={styles.header}>
              <LinearGradient
                colors={['#FF6B35', '#FF3D00']}
                style={styles.logoContainer}
              >
                <MaterialCommunityIcons name="account-plus" size={32} color="white" />
              </LinearGradient>
              <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
                Word een GymBuddy! 🏋️
              </Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Maak je gratis account aan en start je fitness journey
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
                <TextInput
                  label="Naam"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoComplete="name"
                  mode="flat"
                  left={<TextInput.Icon icon="account" color={theme.colors.primary} />}
                  style={styles.input}
                  underlineColor="transparent"
                  activeUnderlineColor={theme.colors.primary}
                />
              </View>

              <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
                <TextInput
                  label="E-mailadres"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  mode="flat"
                  left={<TextInput.Icon icon="email" color={theme.colors.primary} />}
                  style={styles.input}
                  underlineColor="transparent"
                  activeUnderlineColor={theme.colors.primary}
                />
              </View>

              <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
                <TextInput
                  label="Wachtwoord"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  mode="flat"
                  left={<TextInput.Icon icon="lock" color={theme.colors.primary} />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  style={styles.input}
                  underlineColor="transparent"
                  activeUnderlineColor={theme.colors.primary}
                />
              </View>

              <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
                <TextInput
                  label="Bevestig wachtwoord"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  mode="flat"
                  left={<TextInput.Icon icon="lock-check" color={theme.colors.primary} />}
                  style={styles.input}
                  underlineColor="transparent"
                  activeUnderlineColor={theme.colors.primary}
                />
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color={theme.colors.error} />
                  <Text variant="bodySmall" style={{ color: theme.colors.error, marginLeft: 6 }}>
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Password Requirements */}
              <View style={[styles.requirementsContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
                  Wachtwoord vereisten:
                </Text>
                <RequirementItem 
                  met={password.length >= 6} 
                  text="Minimaal 6 tekens" 
                />
                <RequirementItem 
                  met={password === confirmPassword && confirmPassword.length > 0} 
                  text="Wachtwoorden komen overeen" 
                />
              </View>

              <LinearGradient
                colors={['#FF6B35', '#FF3D00']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Button
                  mode="text"
                  onPress={handleRegister}
                  loading={loading}
                  disabled={loading}
                  textColor="white"
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  {loading ? 'Account aanmaken...' : 'Account aanmaken 🚀'}
                </Button>
              </LinearGradient>

              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.outline }]} />
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginHorizontal: 16 }}>
                  of
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.outline }]} />
              </View>

              <Button
                mode="outlined"
                onPress={() => router.replace('/(auth)/login')}
                style={styles.outlineButton}
                contentStyle={styles.buttonContent}
                labelStyle={{ fontWeight: '600' }}
              >
                Ik heb al een account
              </Button>
            </View>

            {/* Terms */}
            <Text variant="bodySmall" style={styles.terms}>
              Door te registreren ga je akkoord met onze{' '}
              <Text style={{ color: theme.colors.primary }}>Voorwaarden</Text> en{' '}
              <Text style={{ color: theme.colors.primary }}>Privacybeleid</Text>
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={styles.requirementItem}>
      <MaterialCommunityIcons 
        name={met ? "check-circle" : "circle-outline"} 
        size={14} 
        color={met ? "#00C853" : "#9E9E9E"} 
      />
      <Text 
        variant="bodySmall" 
        style={{ marginLeft: 8, color: met ? "#00C853" : "#9E9E9E" }}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    marginLeft: -8,
    marginBottom: 8,
  },
  header: {
    marginBottom: 28,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  form: {
    gap: 14,
  },
  inputContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    backgroundColor: 'transparent',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  requirementsContainer: {
    padding: 12,
    borderRadius: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  buttonGradient: {
    borderRadius: 16,
    marginTop: 4,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  outlineButton: {
    borderRadius: 16,
    borderWidth: 2,
  },
  terms: {
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
    opacity: 0.6,
    lineHeight: 20,
  },
});
