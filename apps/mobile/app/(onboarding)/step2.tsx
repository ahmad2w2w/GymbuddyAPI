import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, useColorScheme } from 'react-native';
import { Text, TextInput, Button, useTheme, ProgressBar, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth';
import { GymSearch, GymResult } from '@/components/gym-search';

export default function OnboardingStep2() {
  const router = useRouter();
  const theme = useTheme();
  const { user, updateUser } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [gymName, setGymName] = useState(user?.gymName || '');
  const [gymAddress, setGymAddress] = useState(user?.gymAddress || '');
  const [lat, setLat] = useState<number | null>(user?.lat || null);
  const [lng, setLng] = useState<number | null>(user?.lng || null);
  const [radius, setRadius] = useState(user?.preferredRadius || 10);
  const [loading, setLoading] = useState(false);

  const handleGymSelect = (gym: GymResult) => {
    setGymName(gym.name);
    setGymAddress(gym.address);
    if (gym.lat && gym.lng) {
      setLat(gym.lat);
      setLng(gym.lng);
    }
  };

  const handleNext = async () => {
    if (!gymName) {
      Alert.alert('Verplicht', 'Zoek en selecteer je sportschool');
      return;
    }

    if (!lat || !lng) {
      Alert.alert('Locatie nodig', 'Selecteer een sportschool uit de zoekresultaten zodat we de locatie kunnen bepalen.');
      return;
    }

    setLoading(true);
    try {
      await updateUser({
        gymName,
        gymAddress: gymAddress || null,
        lat,
        lng,
        preferredRadius: radius,
      });
      router.push('/(onboarding)/step3');
    } catch (error) {
      console.error(error);
      Alert.alert('Fout', 'Kon gegevens niet opslaan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D14' : '#FAFAFA' }]}>
      <SafeAreaView style={styles.flex}>
        {/* Progress Header */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <IconButton icon="arrow-left" onPress={() => router.back()} iconColor={theme.colors.onBackground} />
            <View style={styles.progressBarContainer}>
              <ProgressBar progress={0.66} color={theme.colors.primary} style={styles.progress} />
            </View>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              2/3
            </Text>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient
              colors={['#00C853', '#00E676']}
              style={styles.iconContainer}
            >
              <MaterialCommunityIcons name="map-marker" size={32} color="white" />
            </LinearGradient>
            <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
              Waar train je? 🏋️
            </Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              Zoek je sportschool zodat we gym buddies in de buurt kunnen vinden
            </Text>
          </View>

          {/* Gym Search */}
          <View style={[styles.section, { zIndex: 1000 }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="dumbbell" size={18} color={theme.colors.primary} />
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
                Jouw Sportschool
              </Text>
            </View>
            <GymSearch
              value={gymName}
              onSelect={handleGymSelect}
              currentLat={lat}
              currentLng={lng}
              placeholder="Zoek je sportschool..."
            />
          </View>

          {/* Selected Gym Info (shown after selection) */}
          {gymName && lat && lng && (
            <View style={[styles.selectedGymCard, { backgroundColor: isDark ? '#1A2E1A' : '#E8F5E9' }]}>
              <View style={styles.selectedGymIcon}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#00C853" />
              </View>
              <View style={styles.selectedGymInfo}>
                <Text variant="titleSmall" style={{ color: theme.colors.onBackground, fontWeight: '600' }}>
                  {gymName}
                </Text>
                {gymAddress && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    📍 {gymAddress}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Search Radius */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="radar" size={18} color="#FFB800" />
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
                Zoekradius voor buddies
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12, marginTop: -4 }}>
              Hoe ver mag een gym buddy bij jouw gym vandaan trainen?
            </Text>
            <View style={styles.radiusOptions}>
              {[5, 10, 15, 25].map((r) => (
                <View 
                  key={r}
                  style={[
                    styles.radiusOption,
                    { backgroundColor: radius === r ? theme.colors.primary : (isDark ? '#1A1A2E' : '#FFFFFF') }
                  ]}
                  onTouchEnd={() => setRadius(r)}
                >
                  <Text 
                    variant="labelLarge" 
                    style={{ 
                      color: radius === r ? 'white' : theme.colors.onBackground,
                      fontWeight: '700'
                    }}
                  >
                    {r} km
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(0,200,83,0.1)' : 'rgba(0,200,83,0.05)' }]}>
            <MaterialCommunityIcons name="information" size={20} color="#00C853" />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1, marginLeft: 12 }}>
              We gebruiken de locatie van je sportschool om gym buddies in de buurt te vinden. Je kunt per sessie ook een andere gym kiezen.
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={() => router.back()}
            style={styles.backBtn}
            contentStyle={styles.buttonContent}
          >
            Terug
          </Button>
          <LinearGradient
            colors={['#FF6B35', '#FF3D00']}
            style={styles.nextBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Button
              mode="text"
              onPress={handleNext}
              loading={loading}
              disabled={loading || !gymName || !lat}
              textColor="white"
              contentStyle={styles.buttonContent}
              labelStyle={{ fontWeight: 'bold' }}
            >
              Volgende
            </Button>
          </LinearGradient>
        </View>
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
  progressContainer: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarContainer: {
    flex: 1,
  },
  progress: {
    height: 6,
    borderRadius: 3,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  selectedGymCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  selectedGymIcon: {
    marginRight: 12,
  },
  selectedGymInfo: {
    flex: 1,
  },
  radiusOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  radiusOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 32,
    flexDirection: 'row',
    gap: 12,
  },
  backBtn: {
    flex: 1,
    borderRadius: 16,
  },
  nextBtnGradient: {
    flex: 2,
    borderRadius: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
