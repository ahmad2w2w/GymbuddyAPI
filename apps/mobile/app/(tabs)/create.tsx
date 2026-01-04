import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, useColorScheme, Dimensions, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, useTheme, Chip, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { api, CreateSessionInput } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { WORKOUT_TYPES, INTENSITIES } from '@/lib/constants';
import { GymSearch, GymResult } from '@/components/gym-search';

const { width } = Dimensions.get('window');

export default function CreateSessionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [title, setTitle] = useState('');
  const [workoutType, setWorkoutType] = useState<string>('push');
  const [intensity, setIntensity] = useState<string>('medium');
  const [gymName, setGymName] = useState(user?.gymName || '');
  const [gymAddress, setGymAddress] = useState(user?.gymAddress || '');
  const [sessionLat, setSessionLat] = useState<number | null>(user?.lat || null);
  const [sessionLng, setSessionLng] = useState<number | null>(user?.lng || null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState('60');
  const [slots, setSlots] = useState('1');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGymSelect = (gym: GymResult) => {
    setGymName(gym.name);
    setGymAddress(gym.address);
    if (gym.lat && gym.lng) {
      setSessionLat(gym.lat);
      setSessionLng(gym.lng);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Fout', 'Vul een titel in');
      return;
    }
    if (!gymName.trim()) {
      Alert.alert('Fout', 'Vul een gym naam in');
      return;
    }

    setLoading(true);
    try {
      const sessionData: CreateSessionInput = {
        title: title.trim(),
        workoutType,
        intensity,
        gymName: gymName.trim(),
        gymAddress: gymAddress.trim() || null,
        lat: sessionLat || user?.lat || 52.3676,
        lng: sessionLng || user?.lng || 4.9041,
        startTime: date.toISOString(),
        durationMinutes: parseInt(duration) || 60,
        slots: parseInt(slots) || 1,
        notes: notes.trim() || null,
      };

      const response = await api.createSession(sessionData);
      if (response.success) {
        Alert.alert('Gelukt! 💪', 'Je sessie is aangemaakt', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/nearby') },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Fout', error.message || 'Kon sessie niet aanmaken');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setDate(newDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(newDate);
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('nl-NL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getWorkoutIcon = (type: string) => {
    const icons: Record<string, string> = {
      push: 'arm-flex',
      pull: 'weight-lifter',
      legs: 'run',
      cardio: 'run-fast',
      full_body: 'human-handsup',
      upper: 'arm-flex-outline',
      lower: 'shoe-print',
    };
    return icons[type] || 'dumbbell';
  };

  const getIntensityColor = (value: string) => {
    const colors: Record<string, string> = {
      light: '#00C853',
      medium: '#FFB800',
      high: '#FF6B35',
      extreme: '#FF1744',
    };
    return colors[value] || '#FF6B35';
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D14' : '#FAFAFA' }]}>
      {/* Header */}
      <LinearGradient
        colors={['#FF6B35', '#FF3D00']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="plus-circle" size={28} color="white" />
            <Text variant="titleLarge" style={styles.headerTitle}>
              Nieuwe Sessie
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}
            onPress={() => router.push('/roulette')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#9C27B0', '#7B1FA2']}
              style={styles.quickActionIcon}
            >
              <MaterialCommunityIcons name="dice-multiple" size={24} color="white" />
            </LinearGradient>
            <Text variant="labelMedium" style={{ color: isDark ? '#fff' : '#000', fontWeight: '600' }}>
              Workout{'\n'}Roulette 🎰
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}
            onPress={() => router.push('/start-training')}
            activeOpacity={0.7}
          >
            <LinearGradient 
              colors={['#4CAF50', '#2E7D32']}
              style={styles.quickActionIcon}
            >
              <MaterialCommunityIcons name="broadcast" size={24} color="white" />
            </LinearGradient>
            <Text variant="labelMedium" style={{ color: isDark ? '#fff' : '#000', fontWeight: '600' }}>
              Training{'\n'}Starten 📍
            </Text>
          </TouchableOpacity>
        </View>

        {/* Title Input */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(255,107,53,0.1)' }]}>
              <MaterialCommunityIcons name="pencil" size={18} color="#FF6B35" />
            </View>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              Titel
            </Text>
          </View>
          <View style={[styles.inputCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Bijv. Push Day - Heavy Bench"
              mode="flat"
              style={styles.input}
              underlineColor="transparent"
              activeUnderlineColor={theme.colors.primary}
            />
          </View>
        </View>

        {/* Workout Type */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(0,200,83,0.1)' }]}>
              <MaterialCommunityIcons name="dumbbell" size={18} color="#00C853" />
            </View>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              Workout Type
            </Text>
          </View>
          <View style={styles.workoutGrid}>
            {WORKOUT_TYPES.map((type) => (
              <WorkoutTypeChip
                key={type.value}
                label={type.label}
                icon={getWorkoutIcon(type.value)}
                selected={workoutType === type.value}
                onPress={() => setWorkoutType(type.value)}
                isDark={isDark}
              />
            ))}
          </View>
        </View>

        {/* Intensity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(255,184,0,0.1)' }]}>
              <MaterialCommunityIcons name="fire" size={18} color="#FFB800" />
            </View>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              Intensiteit
            </Text>
          </View>
          <View style={styles.intensityRow}>
            {INTENSITIES.map((i) => (
              <IntensityButton
                key={i.value}
                label={i.label}
                selected={intensity === i.value}
                onPress={() => setIntensity(i.value)}
                color={getIntensityColor(i.value)}
                isDark={isDark}
              />
            ))}
          </View>
        </View>

        {/* Gym */}
        <View style={[styles.section, { zIndex: 1000 }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(0,176,255,0.1)' }]}>
              <MaterialCommunityIcons name="map-marker" size={18} color="#00B0FF" />
            </View>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              Locatie
            </Text>
          </View>
          <GymSearch
            value={gymName}
            onSelect={handleGymSelect}
            currentLat={user?.lat}
            currentLng={user?.lng}
            placeholder="Zoek sportschool..."
          />
          {gymName && gymAddress && (
            <View style={[styles.selectedGym, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', marginTop: 12 }]}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#00C853" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onBackground, fontWeight: '600' }}>
                  {gymName}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {gymAddress}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(124,77,255,0.1)' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color="#7C4DFF" />
            </View>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              Datum & Tijd
            </Text>
          </View>
          <View style={styles.dateTimeRow}>
            <View 
              style={[styles.dateTimeCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', flex: 2 }]}
              onTouchEnd={() => setShowDatePicker(true)}
            >
              <MaterialCommunityIcons name="calendar" size={20} color="#7C4DFF" />
              <Text variant="bodyLarge" style={{ marginLeft: 10, color: theme.colors.onBackground, fontWeight: '500' }}>
                {formatDate(date)}
              </Text>
            </View>
            <View 
              style={[styles.dateTimeCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF', flex: 1 }]}
              onTouchEnd={() => setShowTimePicker(true)}
            >
              <MaterialCommunityIcons name="clock-outline" size={20} color="#7C4DFF" />
              <Text variant="bodyLarge" style={{ marginLeft: 8, color: theme.colors.onBackground, fontWeight: '500' }}>
                {formatTime(date)}
              </Text>
            </View>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              minimumDate={new Date()}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(0,200,83,0.1)' }]}>
              <MaterialCommunityIcons name="timer-outline" size={18} color="#00C853" />
            </View>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              Duur (minuten)
            </Text>
          </View>
          <View style={styles.optionsRow}>
            {['30', '45', '60', '90', '120'].map((d) => (
              <OptionButton
                key={d}
                label={d}
                selected={duration === d}
                onPress={() => setDuration(d)}
                isDark={isDark}
              />
            ))}
          </View>
        </View>

        {/* Slots */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(255,107,53,0.1)' }]}>
              <MaterialCommunityIcons name="account-group" size={18} color="#FF6B35" />
            </View>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              Aantal plekken
            </Text>
          </View>
          <View style={styles.optionsRow}>
            {['1', '2', '3', '4', '5'].map((s) => (
              <OptionButton
                key={s}
                label={s}
                selected={slots === s}
                onPress={() => setSlots(s)}
                isDark={isDark}
              />
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(158,158,158,0.1)' }]}>
              <MaterialCommunityIcons name="text" size={18} color="#9E9E9E" />
            </View>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              Notities (optioneel)
            </Text>
          </View>
          <View style={[styles.inputCard, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Extra info voor deelnemers..."
              mode="flat"
              multiline
              numberOfLines={3}
              style={[styles.input, { minHeight: 80 }]}
              underlineColor="transparent"
            />
          </View>
        </View>

        {/* Create Button */}
        <LinearGradient
          colors={['#FF6B35', '#FF3D00']}
          style={styles.createButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Button
            mode="text"
            onPress={handleCreate}
            loading={loading}
            disabled={loading}
            textColor="white"
            contentStyle={styles.createButtonContent}
            labelStyle={styles.createButtonLabel}
          >
            {loading ? 'Aanmaken...' : 'Sessie Publiceren 🚀'}
          </Button>
        </LinearGradient>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

function WorkoutTypeChip({ label, icon, selected, onPress, isDark }: { label: string; icon: string; selected: boolean; onPress: () => void; isDark: boolean }) {
  return (
    <View 
      style={[
        styles.workoutChip, 
        { backgroundColor: selected ? '#FF6B35' : (isDark ? '#1A1A2E' : '#FFFFFF') },
        selected && styles.workoutChipSelected
      ]}
      onTouchEnd={onPress}
    >
      <MaterialCommunityIcons 
        name={icon as any} 
        size={18} 
        color={selected ? 'white' : '#FF6B35'} 
      />
      <Text 
        variant="labelMedium" 
        style={{ color: selected ? 'white' : (isDark ? '#FAFAFA' : '#1A1A2E'), marginLeft: 6, fontWeight: '600' }}
      >
        {label}
      </Text>
    </View>
  );
}

function IntensityButton({ label, selected, onPress, color, isDark }: { label: string; selected: boolean; onPress: () => void; color: string; isDark: boolean }) {
  return (
    <View 
      style={[
        styles.intensityButton, 
        { 
          backgroundColor: selected ? color : (isDark ? '#1A1A2E' : '#FFFFFF'),
          borderColor: selected ? color : 'transparent',
        }
      ]}
      onTouchEnd={onPress}
    >
      <Text 
        variant="labelMedium" 
        style={{ color: selected ? 'white' : (isDark ? '#FAFAFA' : '#1A1A2E'), fontWeight: '600' }}
      >
        {label}
      </Text>
    </View>
  );
}

function OptionButton({ label, selected, onPress, isDark }: { label: string; selected: boolean; onPress: () => void; isDark: boolean }) {
  return (
    <View 
      style={[
        styles.optionButton, 
        { 
          backgroundColor: selected ? '#FF6B35' : (isDark ? '#1A1A2E' : '#FFFFFF'),
        }
      ]}
      onTouchEnd={onPress}
    >
      <Text 
        variant="labelLarge" 
        style={{ color: selected ? 'white' : (isDark ? '#FAFAFA' : '#1A1A2E'), fontWeight: '700' }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontWeight: '600',
  },
  inputCard: {
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
  workoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  workoutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  workoutChipSelected: {
    shadowColor: '#FF6B35',
    shadowOpacity: 0.3,
    elevation: 4,
  },
  intensityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  intensityButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeCard: {
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
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
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
  createButtonGradient: {
    borderRadius: 16,
    marginTop: 8,
  },
  createButtonContent: {
    paddingVertical: 8,
  },
  createButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedGym: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,200,83,0.3)',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  quickActionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
