import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, ProgressBar, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth } from '@/lib/auth';

export default function OnboardingStep2() {
  const router = useRouter();
  const theme = useTheme();
  const { user, updateUser } = useAuth();

  const [gymName, setGymName] = useState(user?.gymName || '');
  const [gymAddress, setGymAddress] = useState(user?.gymAddress || '');
  const [lat, setLat] = useState<number | null>(user?.lat || null);
  const [lng, setLng] = useState<number | null>(user?.lng || null);
  const [radius, setRadius] = useState(user?.preferredRadius || 10);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Locatie toegang', 'We hebben locatie toegang nodig om gyms in de buurt te vinden.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setLat(location.coords.latitude);
      setLng(location.coords.longitude);

      // Try to get address
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        const addressStr = [address.street, address.city].filter(Boolean).join(', ');
        if (!gymAddress) {
          setGymAddress(addressStr);
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Fout', 'Kon locatie niet ophalen');
    } finally {
      setLocationLoading(false);
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.progressContainer}>
        <ProgressBar progress={0.66} color={theme.colors.primary} style={styles.progress} />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Stap 2 van 3
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Waar train je?
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Voeg je gym toe zodat we mensen in de buurt kunnen vinden
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Gym naam *
          </Text>
          <TextInput
            value={gymName}
            onChangeText={setGymName}
            placeholder="Bijv. Basic-Fit Amsterdam"
            mode="outlined"
            left={<TextInput.Icon icon="dumbbell" />}
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Adres (optioneel)
          </Text>
          <TextInput
            value={gymAddress}
            onChangeText={setGymAddress}
            placeholder="Straat, Stad"
            mode="outlined"
            left={<TextInput.Icon icon="map-marker" />}
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Button
            mode="outlined"
            onPress={getCurrentLocation}
            loading={locationLoading}
            disabled={locationLoading}
            icon="crosshairs-gps"
            style={styles.locationButton}
          >
            {lat ? 'Locatie opgehaald ✓' : 'Gebruik huidige locatie'}
          </Button>
          {lat && lng && (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
              Coördinaten: {lat.toFixed(4)}, {lng.toFixed(4)}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Zoekradius
          </Text>
          <SegmentedButtons
            value={radius.toString()}
            onValueChange={(value) => setRadius(parseInt(value))}
            buttons={[
              { value: '5', label: '5 km' },
              { value: '10', label: '10 km' },
              { value: '15', label: '15 km' },
              { value: '25', label: '25 km' },
            ]}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={[styles.button, styles.backButton]}
          contentStyle={styles.buttonContent}
        >
          Terug
        </Button>
        <Button
          mode="contained"
          onPress={handleNext}
          loading={loading}
          disabled={loading || !gymName}
          style={[styles.button, styles.nextButton]}
          contentStyle={styles.buttonContent}
        >
          Volgende
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    padding: 16,
    gap: 8,
  },
  progress: {
    height: 4,
    borderRadius: 2,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 0,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'transparent',
  },
  locationButton: {
    borderRadius: 12,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 12,
  },
  backButton: {},
  nextButton: {},
  buttonContent: {
    paddingVertical: 8,
  },
});



