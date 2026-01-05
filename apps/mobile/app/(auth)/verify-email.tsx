import { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TextInput as RNTextInput, KeyboardAvoidingView, Platform, useColorScheme, Animated } from 'react-native';
import { Text, Button, useTheme, IconButton } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '@/lib/api';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams<{ email: string }>();
  const email = params.email || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(RNTextInput | null)[]>([]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleCodeChange = (text: string, index: number) => {
    // Only allow numbers
    const cleaned = text.replace(/[^0-9]/g, '');
    
    if (cleaned.length <= 1) {
      const newCode = [...code];
      newCode[index] = cleaned;
      setCode(newCode);
      setError('');

      // Auto-focus next input
      if (cleaned && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all digits are entered
      if (cleaned && index === 5) {
        const fullCode = [...newCode.slice(0, 5), cleaned].join('');
        if (fullCode.length === 6) {
          handleVerify(fullCode);
        }
      }
    } else if (cleaned.length === 6) {
      // Handle paste of full code
      const digits = cleaned.split('');
      setCode(digits);
      handleVerify(cleaned);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (fullCode?: string) => {
    const verificationCode = fullCode || code.join('');
    
    if (verificationCode.length !== 6) {
      setError('Voer de volledige 6-cijferige code in');
      shake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/verify-email', {
        email,
        code: verificationCode
      });

      if (response.data.success) {
        setSuccess('Email geverifieerd! 🎉');
        setTimeout(() => {
          router.replace('/(onboarding)/step1');
        }, 1500);
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Verificatie mislukt';
      setError(message);
      shake();
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setResendLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/resend-verification', { email });
      
      if (response.data.success) {
        setSuccess('Nieuwe code verzonden! 📧');
        setResendCooldown(60); // 60 second cooldown
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError('Kon geen nieuwe code verzenden');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSkip = () => {
    // Allow users to skip verification for now, but they'll need to verify later
    router.replace('/(onboarding)/step1');
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D14' : '#FAFAFA' }]}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
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
                colors={['#10b981', '#059669']}
                style={styles.iconContainer}
              >
                <MaterialCommunityIcons name="email-check" size={40} color="white" />
              </LinearGradient>
              
              <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
                Verifieer je email 📬
              </Text>
              
              <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                We hebben een 6-cijferige code gestuurd naar:
              </Text>
              
              <Text variant="titleMedium" style={[styles.email, { color: theme.colors.primary }]}>
                {email}
              </Text>
            </View>

            {/* Code Input */}
            <Animated.View 
              style={[
                styles.codeContainer,
                { transform: [{ translateX: shakeAnimation }] }
              ]}
            >
              {code.map((digit, index) => (
                <RNTextInput
                  key={index}
                  ref={(ref) => inputRefs.current[index] = ref}
                  style={[
                    styles.codeInput,
                    {
                      backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF',
                      borderColor: digit ? theme.colors.primary : (isDark ? '#2A2A3E' : '#E0E0E0'),
                      color: theme.colors.onBackground,
                    }
                  ]}
                  value={digit}
                  onChangeText={(text) => handleCodeChange(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!loading && !success}
                />
              ))}
            </Animated.View>

            {/* Error/Success Messages */}
            {error ? (
              <View style={styles.messageContainer}>
                <MaterialCommunityIcons name="alert-circle" size={18} color={theme.colors.error} />
                <Text variant="bodyMedium" style={{ color: theme.colors.error, marginLeft: 8 }}>
                  {error}
                </Text>
              </View>
            ) : null}

            {success ? (
              <View style={styles.messageContainer}>
                <MaterialCommunityIcons name="check-circle" size={18} color="#10b981" />
                <Text variant="bodyMedium" style={{ color: '#10b981', marginLeft: 8 }}>
                  {success}
                </Text>
              </View>
            ) : null}

            {/* Verify Button */}
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Button
                mode="text"
                onPress={() => handleVerify()}
                loading={loading}
                disabled={loading || code.join('').length !== 6 || !!success}
                textColor="white"
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                {loading ? 'Verifiëren...' : 'Verifieer Email ✓'}
              </Button>
            </LinearGradient>

            {/* Resend Section */}
            <View style={styles.resendSection}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Geen code ontvangen?
              </Text>
              
              <Button
                mode="text"
                onPress={handleResend}
                disabled={resendCooldown > 0 || resendLoading}
                loading={resendLoading}
                textColor={theme.colors.primary}
              >
                {resendCooldown > 0 
                  ? `Opnieuw versturen (${resendCooldown}s)` 
                  : 'Verstuur opnieuw'}
              </Button>
            </View>

            {/* Skip Option */}
            <Button
              mode="text"
              onPress={handleSkip}
              textColor={theme.colors.onSurfaceVariant}
              style={styles.skipButton}
            >
              Later verifiëren →
            </Button>

            {/* Info */}
            <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.05)' }]}>
              <MaterialCommunityIcons name="information" size={20} color="#10b981" />
              <Text variant="bodySmall" style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
                Verificatie geeft je +20 vertrouwenspunten en laat andere gebruikers zien dat je een echt account hebt.
              </Text>
            </View>
          </View>
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
  content: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    marginLeft: -8,
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontWeight: '600',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttonGradient: {
    borderRadius: 16,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  skipButton: {
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    lineHeight: 20,
  },
});
