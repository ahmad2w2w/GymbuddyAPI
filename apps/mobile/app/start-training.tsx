import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Alert,
  Linking,
  Platform,
  AppState,
} from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const WORKOUT_TYPES = [
  { id: 'push', name: 'Push', icon: 'arm-flex', color: '#FF6B35' },
  { id: 'pull', name: 'Pull', icon: 'weight-lifter', color: '#4ECDC4' },
  { id: 'legs', name: 'Legs', icon: 'run-fast', color: '#9B59B6' },
  { id: 'cardio', name: 'Cardio', icon: 'heart-pulse', color: '#E74C3C' },
  { id: 'core', name: 'Core', icon: 'human', color: '#F39C12' },
  { id: 'full_body', name: 'Full Body', icon: 'dumbbell', color: '#1ABC9C' },
];

const DURATIONS = [30, 45, 60, 90, 120];

export default function StartTrainingScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();
  const params = useLocalSearchParams<{ workoutType?: string; workoutName?: string }>();
  
  const [selectedType, setSelectedType] = useState(params.workoutType || 'push');
  const [duration, setDuration] = useState(60);
  const [note, setNote] = useState(params.workoutName ? `${params.workoutName}` : '');
  const [gymName, setGymName] = useState(user?.gymName || '');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Track if user went to settings
  const waitingForSettings = useRef(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    getLocation();
  }, []);

  // Listen for app state changes (when user comes back from settings)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (waitingForSettings.current) {
          waitingForSettings.current = false;
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === 'granted') {
            fetchLocationOnly();
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const openSettings = () => {
    waitingForSettings.current = true;
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  // Fetch location without permission prompts
  const fetchLocationOnly = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const getLocation = async () => {
    try {
      // Check existing permission status first
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      
      if (existingStatus === 'denied') {
        Alert.alert(
          'Locatie nodig',
          'Je hebt locatie toegang geweigerd. Ga naar Instellingen om dit aan te zetten.',
          [
            { text: 'Annuleren', style: 'cancel' },
            { text: 'Open Instellingen', onPress: openSettings }
          ]
        );
        return;
      }
      
      if (existingStatus === 'granted') {
        fetchLocationOnly();
        return;
      }
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Locatie nodig',
          'We hebben je locatie nodig om je training te starten.',
          [
            { text: 'Annuleren', style: 'cancel' },
            { text: 'Open Instellingen', onPress: openSettings }
          ]
        );
        return;
      }
      
      fetchLocationOnly();
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Fout', 'Kon locatie niet ophalen. Probeer opnieuw.');
    }
  };

  const handleStartTraining = async () => {
    if (!gymName.trim()) {
      Alert.alert('Oeps', 'Vul je gym naam in');
      return;
    }
    
    if (!location) {
      Alert.alert('Oeps', 'Locatie niet beschikbaar');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await api.startTraining({
        gymName: gymName.trim(),
        lat: location.lat,
        lng: location.lng,
        workoutType: selectedType,
        durationMinutes: duration,
        note: note.trim() || undefined,
      });
      
      Alert.alert(
        '🏋️ Training Gestart!',
        response.data.message,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Fout', error.message || 'Kon training niet starten');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedWorkout = WORKOUT_TYPES.find(w => w.id === selectedType);

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      {/* Header */}
      <LinearGradient
        colors={['#FF6B35', '#FF3D00']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Start Training</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={[styles.statusBadge, isDark && styles.cardDark]}>
          <MaterialCommunityIcons name="broadcast" size={20} color="#4CAF50" />
          <Text style={[styles.statusText, isDark && styles.textLight]}>
            Je wordt zichtbaar voor andere gym buddies in de buurt!
          </Text>
        </View>

        {/* Workout Type */}
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Workout Type</Text>
        <View style={styles.typeGrid}>
          {WORKOUT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                isDark && styles.cardDark,
                selectedType === type.id && { borderColor: type.color, borderWidth: 2 },
              ]}
              onPress={() => setSelectedType(type.id)}
            >
              <View style={[styles.typeIcon, { backgroundColor: type.color + '20' }]}>
                <MaterialCommunityIcons name={type.icon as any} size={24} color={type.color} />
              </View>
              <Text style={[styles.typeName, isDark && styles.textLight, selectedType === type.id && { color: type.color }]}>
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Duration */}
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Geschatte Duur</Text>
        <View style={styles.durationRow}>
          {DURATIONS.map((dur) => (
            <TouchableOpacity
              key={dur}
              style={[
                styles.durationChip,
                isDark && styles.chipDark,
                duration === dur && styles.durationChipActive,
              ]}
              onPress={() => setDuration(dur)}
            >
              <Text style={[
                styles.durationText,
                isDark && styles.textMuted,
                duration === dur && styles.durationTextActive,
              ]}>
                {dur} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gym Name */}
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Gym</Text>
        <TextInput
          mode="outlined"
          value={gymName}
          onChangeText={setGymName}
          placeholder="Bijv. Basic-Fit Amsterdam"
          style={[styles.input, isDark && styles.inputDark]}
          outlineColor={isDark ? '#333' : '#ddd'}
          activeOutlineColor="#FF6B35"
          textColor={isDark ? '#fff' : '#000'}
          left={<TextInput.Icon icon="map-marker" color="#FF6B35" />}
        />

        {/* Note */}
        <Text style={[styles.sectionTitle, isDark && styles.textLight]}>Notitie (optioneel)</Text>
        <TextInput
          mode="outlined"
          value={note}
          onChangeText={setNote}
          placeholder="Bijv. Push Day - zoek een spotter!"
          style={[styles.input, isDark && styles.inputDark]}
          outlineColor={isDark ? '#333' : '#ddd'}
          activeOutlineColor="#FF6B35"
          textColor={isDark ? '#fff' : '#000'}
          left={<TextInput.Icon icon="note-text" color="#FF6B35" />}
        />

        {/* Preview Card */}
        <View style={[styles.previewCard, isDark && styles.cardDark]}>
          <Text style={[styles.previewTitle, isDark && styles.textLight]}>Preview:</Text>
          <View style={styles.previewContent}>
            <View style={[styles.previewIcon, { backgroundColor: selectedWorkout?.color + '20' }]}>
              <MaterialCommunityIcons 
                name={selectedWorkout?.icon as any} 
                size={32} 
                color={selectedWorkout?.color} 
              />
            </View>
            <View style={styles.previewInfo}>
              <Text style={[styles.previewName, isDark && styles.textLight]}>
                {user?.name || 'Jij'}
              </Text>
              <Text style={[styles.previewMeta, isDark && styles.textMuted]}>
                {selectedWorkout?.name} • {duration} min • {gymName || 'Je gym'}
              </Text>
              {note ? (
                <Text style={[styles.previewNote, isDark && styles.textMuted]}>
                  "{note}"
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          onPress={handleStartTraining}
          disabled={isLoading}
          style={styles.startButton}
        >
          <LinearGradient
            colors={isLoading ? ['#666', '#444'] : ['#4CAF50', '#2E7D32']}
            style={styles.startButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <MaterialCommunityIcons name="play-circle" size={28} color="white" />
                <Text style={styles.startButtonText}>Start Training</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={[styles.disclaimer, isDark && styles.textMuted]}>
          Je kunt je training op elk moment stoppen via je profiel.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  typeCard: {
    width: '31%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardDark: {
    backgroundColor: '#1e1e1e',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  typeName: {
    fontSize: 13,
    fontWeight: '600',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  durationChip: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  chipDark: {
    backgroundColor: '#1e1e1e',
  },
  durationChipActive: {
    backgroundColor: '#FF6B35',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  durationTextActive: {
    color: 'white',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  inputDark: {
    backgroundColor: '#1e1e1e',
  },
  previewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#666',
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  previewIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  previewMeta: {
    fontSize: 13,
    color: '#888',
  },
  previewNote: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  startButton: {
    marginBottom: 16,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  disclaimer: {
    textAlign: 'center',
    fontSize: 13,
    color: '#888',
  },
  textLight: {
    color: '#fff',
  },
  textMuted: {
    color: '#999',
  },
});

