import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme, Chip, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { api, CreateSessionInput } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { WORKOUT_TYPES, INTENSITIES } from '@/lib/constants';

export default function CreateSessionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [workoutType, setWorkoutType] = useState<string>('push');
  const [intensity, setIntensity] = useState<string>('medium');
  const [gymName, setGymName] = useState(user?.gymName || '');
  const [gymAddress, setGymAddress] = useState(user?.gymAddress || '');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState('60');
  const [slots, setSlots] = useState('1');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

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
        lat: user?.lat || 52.3676,
        lng: user?.lng || 4.9041,
        startTime: date.toISOString(),
        durationMinutes: parseInt(duration) || 60,
        slots: parseInt(slots) || 1,
        notes: notes.trim() || null,
      };

      const response = await api.createSession(sessionData);
      if (response.success) {
        Alert.alert('Gelukt!', 'Je sessie is aangemaakt', [
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
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('nl-NL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          Nieuwe Sessie
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Titel *
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Bijv. Push Day - Heavy Bench"
            mode="outlined"
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Workout Type
          </Text>
          <View style={styles.chipContainer}>
            {WORKOUT_TYPES.map((type) => (
              <Chip
                key={type.value}
                selected={workoutType === type.value}
                onPress={() => setWorkoutType(type.value)}
                showSelectedOverlay
                style={styles.chip}
              >
                {type.label}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Intensiteit
          </Text>
          <SegmentedButtons
            value={intensity}
            onValueChange={setIntensity}
            buttons={INTENSITIES.map((i) => ({ value: i.value, label: i.label }))}
          />
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Gym *
          </Text>
          <TextInput
            value={gymName}
            onChangeText={setGymName}
            placeholder="Gym naam"
            mode="outlined"
            left={<TextInput.Icon icon="dumbbell" />}
            style={styles.input}
          />
          <TextInput
            value={gymAddress}
            onChangeText={setGymAddress}
            placeholder="Adres (optioneel)"
            mode="outlined"
            left={<TextInput.Icon icon="map-marker" />}
            style={[styles.input, { marginTop: 8 }]}
          />
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Datum & Tijd
          </Text>
          <View style={styles.dateTimeRow}>
            <Button
              mode="outlined"
              onPress={() => setShowDatePicker(true)}
              icon="calendar"
              style={styles.dateButton}
            >
              {formatDate(date)}
            </Button>
            <Button
              mode="outlined"
              onPress={() => setShowTimePicker(true)}
              icon="clock"
              style={styles.timeButton}
            >
              {formatTime(date)}
            </Button>
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

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Duur (minuten)
          </Text>
          <SegmentedButtons
            value={duration}
            onValueChange={setDuration}
            buttons={[
              { value: '30', label: '30' },
              { value: '45', label: '45' },
              { value: '60', label: '60' },
              { value: '90', label: '90' },
              { value: '120', label: '120' },
            ]}
          />
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Aantal plekken
          </Text>
          <SegmentedButtons
            value={slots}
            onValueChange={setSlots}
            buttons={[
              { value: '1', label: '1' },
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
              { value: '5', label: '5' },
            ]}
          />
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Notities (optioneel)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Extra info voor deelnemers..."
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />
        </View>

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          disabled={loading}
          style={styles.createButton}
          contentStyle={styles.createButtonContent}
        >
          Sessie Publiceren
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    backgroundColor: 'transparent',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 2,
  },
  timeButton: {
    flex: 1,
  },
  createButton: {
    marginTop: 16,
    borderRadius: 12,
  },
  createButtonContent: {
    paddingVertical: 8,
  },
});



