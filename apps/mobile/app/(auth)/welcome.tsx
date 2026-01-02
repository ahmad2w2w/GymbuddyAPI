import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, ImageBackground } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  
  // Animations
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(30)).current;
  const featuresOpacity = useRef(new Animated.Value(0)).current;
  const featuresTranslate = useRef(new Animated.Value(50)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslate = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Logo animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 40,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Title animation
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 500,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslate, {
        toValue: 0,
        duration: 500,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Features animation
    Animated.parallel([
      Animated.timing(featuresOpacity, {
        toValue: 1,
        duration: 500,
        delay: 500,
        useNativeDriver: true,
      }),
      Animated.timing(featuresTranslate, {
        toValue: 0,
        duration: 500,
        delay: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Buttons animation
    Animated.parallel([
      Animated.timing(buttonsOpacity, {
        toValue: 1,
        duration: 500,
        delay: 700,
        useNativeDriver: true,
      }),
      Animated.timing(buttonsTranslate, {
        toValue: 0,
        duration: 500,
        delay: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const logoRotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['-15deg', '0deg'],
  });

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F0F1A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.decorCircle1]} />
      <View style={[styles.decorCircle, styles.decorCircle2]} />
      <View style={[styles.decorCircle, styles.decorCircle3]} />

      <SafeAreaView style={styles.content}>
        {/* Header with Logo */}
        <View style={styles.header}>
          <Animated.View 
            style={[
              styles.logoContainer,
              { 
                transform: [
                  { scale: Animated.multiply(logoScale, pulseAnim) },
                  { rotate: logoRotation }
                ] 
              }
            ]}
          >
            <LinearGradient
              colors={['#FF6B35', '#FF3D00']}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="dumbbell" size={60} color="white" />
            </LinearGradient>
          </Animated.View>
          
          <Animated.View 
            style={{ 
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslate }]
            }}
          >
            <Text variant="displaySmall" style={styles.title}>
              GymBuddy
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Train harder. Together.
            </Text>
          </Animated.View>
        </View>

        {/* Features */}
        <Animated.View 
          style={[
            styles.features, 
            { 
              opacity: featuresOpacity,
              transform: [{ translateY: featuresTranslate }]
            }
          ]}
        >
          <FeatureCard
            icon="fire"
            title="Vind je Gym Partner"
            description="Match met mensen die dezelfde workout goals hebben"
            color="#FF6B35"
            delay={0}
          />
          <FeatureCard
            icon="lightning-bolt"
            title="Train Sessies"
            description="Ontdek en join sessies bij jouw sportschool"
            color="#FFB800"
            delay={100}
          />
          <FeatureCard
            icon="trophy"
            title="Groei Samen"
            description="Motiveer elkaar en behaal je doelen"
            color="#00C853"
            delay={200}
          />
        </Animated.View>

        {/* Buttons */}
        <Animated.View 
          style={[
            styles.buttons, 
            { 
              opacity: buttonsOpacity,
              transform: [{ translateY: buttonsTranslate }]
            }
          ]}
        >
          <LinearGradient
            colors={['#FF6B35', '#FF3D00']}
            style={styles.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Button
              mode="text"
              onPress={() => router.push('/(auth)/register')}
              contentStyle={styles.buttonContent}
              labelStyle={styles.primaryButtonLabel}
              textColor="white"
            >
              START JE JOURNEY 💪
            </Button>
          </LinearGradient>
          
          <Button
            mode="text"
            onPress={() => router.push('/(auth)/login')}
            style={styles.secondaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.secondaryButtonLabel}
            textColor="rgba(255,255,255,0.8)"
          >
            Heb je al een account? Log in
          </Button>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
  delay,
}: {
  icon: string;
  title: string;
  description: string;
  color: string;
  delay: number;
}) {
  const translateX = useRef(new Animated.Value(-30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 400,
        delay: 600 + delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: 600 + delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View 
      style={[
        styles.featureCard,
        { opacity, transform: [{ translateX }] }
      ]}
    >
      <View style={[styles.featureIconContainer, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      </View>
      <View style={styles.featureText}>
        <Text variant="titleSmall" style={styles.featureTitle}>
          {title}
        </Text>
        <Text variant="bodySmall" style={styles.featureDescription}>
          {description}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.3)" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.1,
  },
  decorCircle1: {
    width: width * 1.5,
    height: width * 1.5,
    backgroundColor: '#FF6B35',
    top: -width * 0.5,
    right: -width * 0.5,
  },
  decorCircle2: {
    width: width,
    height: width,
    backgroundColor: '#FF3D00',
    bottom: -width * 0.3,
    left: -width * 0.3,
  },
  decorCircle3: {
    width: width * 0.8,
    height: width * 0.8,
    backgroundColor: '#FFB800',
    top: height * 0.4,
    right: -width * 0.4,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  features: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: 'white',
    fontWeight: '600',
  },
  featureDescription: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  buttons: {
    gap: 8,
    marginBottom: 16,
  },
  gradientButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  secondaryButton: {
    marginTop: 4,
  },
  secondaryButtonLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
