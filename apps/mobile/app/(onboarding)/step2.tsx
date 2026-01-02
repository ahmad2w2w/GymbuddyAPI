import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, useColorScheme } from 'react-native';
import { Text, TextInput, Button, useTheme, ProgressBar, SegmentedButtons, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
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
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationStatus('loading');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Locatie toegang', 'We hebben locatie toegang nodig om gyms in de buurt te vinden.');
        setLocationStatus('error');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLat(location.coords.latitude);
      setLng(location.coords.longitude);

      // Try to get address
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address && !gymAddress) {
        const addressStr = [address.street, address.city].filter(Boolean).join(', ');
        setGymAddress(addressStr);
      }
      
      setLocationStatus('success');
    } catch (error) {
      console.error(error);
      Alert.alert('Fout', 'Kon locatie niet ophalen');
      setLocationStatus('error');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleGymSelect = (gym: GymResult) => {
    setGymName(gym.name);
    setGymAddress(gym.address);
    if (gym.lat && gym.lng) {
      setLat(gym.lat);
      setLng(gym.lng);
      setLocationStatus('success');
    }
  };

  const handleNext = async () => {
    if (!gymName) {
      Alert.alert('Verplicht', 'Vul je gym naam in');
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
              Zoek je sportschool zodat we mensen in de buurt kunnen vinden
            </Text>
          </View>

          {/* Gym Search */}
          <View style={[styles.section, { zIndex: 1000 }]}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="dumbbell" size={18} color={theme.colors.primary} />
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
                Sportschool
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

          {/* Address (shown after selection) */}
          {gymName && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="map-marker-outline" size={18} color="#00B0FF" />
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
                  Adres
                </Text>
              </View>
              <View style={[styles.inputContainer, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
                <TextInput
                  value={gymAddress}
                  onChangeText={setGymAddress}
                  placeholder="Straat, Stad"
                  mode="flat"
                  left={<TextInput.Icon icon="map-marker" color="#00B0FF" />}
                  style={styles.input}
                  underlineColor="transparent"
                />
              </View>
            </View>
          )}

          {/* Location Button */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#7C4DFF" />
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
                Locatie
              </Text>
            </View>
            
            <View 
              style={[
                styles.locationButton, 
                { 
                  backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF',
                  borderColor: locationStatus === 'success' ? '#00C853' : 'transparent',
                  borderWidth: locationStatus === 'success' ? 2 : 0,
                }
              ]}
              onTouchEnd={getCurrentLocation}
            >
              <View style={[styles.locationIcon, { backgroundColor: locationStatus === 'success' ? 'rgba(0,200,83,0.1)' : 'rgba(124,77,255,0.1)' }]}>
                <MaterialCommunityIcons 
                  name={locationStatus === 'success' ? "check" : "crosshairs-gps"} 
                  size={24} 
                  color={locationStatus === 'success' ? "#00C853" : "#7C4DFF"} 
                />
              </View>
              <View style={styles.locationText}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onBackground, fontWeight: '600' }}>
                  {locationStatus === 'success' ? 'Locatie opgehaald ✓' : 'Gebruik huidige locatie'}
                </Text>
                {lat && lng ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {lat.toFixed(4)}, {lng.toFixed(4)}
                  </Text>
                ) : (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Tik om je locatie te gebruiken
                  </Text>
                )}
              </View>
              {locationLoading && (
                <MaterialCommunityIcons name="loading" size={20} color={theme.colors.primary} />
              )}
            </View>
          </View>

          {/* Search Radius */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="radar" size={18} color="#FFB800" />
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
                Zoekradius
              </Text>
            </View>
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
          <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(255,107,53,0.1)' : 'rgba(255,107,53,0.05)' }]}>
            <MaterialCommunityIcons name="information" size={20} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1, marginLeft: 12 }}>
              Je locatie wordt alleen gebruikt om gym buddies in de buurt te vinden. Je exacte locatie wordt nooit gedeeld.
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
              disabled={loading || !gymName}
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
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  locationText: {
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
