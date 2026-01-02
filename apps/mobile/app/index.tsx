import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useAuth } from '@/lib/auth';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function IndexScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { isLoading, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        // Check if profile is complete
        if (!user?.gymName || !user?.goals?.length || !user?.level) {
          router.replace('/(onboarding)/step1');
        } else {
          router.replace('/(tabs)/feed');
        }
      } else {
        router.replace('/(auth)/welcome');
      }
    }
  }, [isLoading, isAuthenticated, user]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <MaterialCommunityIcons name="dumbbell" size={80} color="white" />
      <Text variant="displaySmall" style={styles.title}>
        GymBuddy
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Vind je trainingsmaatje
      </Text>
      <ActivityIndicator size="large" color="white" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    marginTop: 16,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  loader: {
    marginTop: 32,
  },
});
