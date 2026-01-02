import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, useColorScheme } from 'react-native';
import { Text, TextInput, Button, useTheme, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { login } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Vul alle velden in');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
      router.replace('/(tabs)/feed');
    } catch (err: any) {
      setError(err.message || 'Inloggen mislukt');
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
                <MaterialCommunityIcons name="dumbbell" size={32} color="white" />
              </LinearGradient>
              <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
                Welkom terug! 👋
              </Text>
              <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                Log in om verder te gaan met trainen
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
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

              {error ? (
                <View style={styles.errorContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={16} color={theme.colors.error} />
                  <Text variant="bodySmall" style={{ color: theme.colors.error, marginLeft: 6 }}>
                    {error}
                  </Text>
                </View>
              ) : null}

              <Button
                mode="text"
                onPress={() => router.push('/(auth)/forgot-password')}
                compact
                style={{ alignSelf: 'flex-end' }}
                textColor={theme.colors.primary}
              >
                Wachtwoord vergeten?
              </Button>

              <LinearGradient
                colors={['#FF6B35', '#FF3D00']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Button
                  mode="text"
                  onPress={handleLogin}
                  loading={loading}
                  disabled={loading}
                  textColor="white"
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  {loading ? 'Inloggen...' : 'Inloggen 💪'}
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
                onPress={() => router.replace('/(auth)/register')}
                style={styles.outlineButton}
                contentStyle={styles.buttonContent}
                labelStyle={{ fontWeight: '600' }}
              >
                Nieuw account maken
              </Button>
            </View>

            {/* Demo Account */}
            <View style={[styles.demo, { backgroundColor: isDark ? 'rgba(255,107,53,0.1)' : 'rgba(255,107,53,0.05)' }]}>
              <MaterialCommunityIcons name="information" size={18} color={theme.colors.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                  Demo Account
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  jan@example.com / password123
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    marginBottom: 32,
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
    gap: 16,
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
  buttonGradient: {
    borderRadius: 16,
    marginTop: 8,
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
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  outlineButton: {
    borderRadius: 16,
    borderWidth: 2,
  },
  demo: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
});
