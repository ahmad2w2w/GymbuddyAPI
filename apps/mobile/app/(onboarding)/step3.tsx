import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, useTheme, Chip, ProgressBar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { TRAINING_STYLES, WEEKDAYS, TIME_SLOTS, INTEREST_TAGS } from '@/lib/constants';

export default function OnboardingStep3() {
  const router = useRouter();
  const theme = useTheme();
  const { user, updateUser } = useAuth();

  const [trainingStyle, setTrainingStyle] = useState<string | null>(user?.trainingStyle || null);
  const [selectedTags, setSelectedTags] = useState<string[]>(user?.interestTags || []);
  const [availability, setAvailability] = useState<{ day: string; timeSlots: string[] }[]>(
    user?.availability || []
  );
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleDaySlot = (day: string, slot: string) => {
    setAvailability((prev) => {
      const dayAvail = prev.find((a) => a.day === day);
      if (dayAvail) {
        const newSlots = dayAvail.timeSlots.includes(slot)
          ? dayAvail.timeSlots.filter((s) => s !== slot)
          : [...dayAvail.timeSlots, slot];
        
        if (newSlots.length === 0) {
          return prev.filter((a) => a.day !== day);
        }
        return prev.map((a) => (a.day === day ? { ...a, timeSlots: newSlots } : a));
      }
      return [...prev, { day, timeSlots: [slot] }];
    });
  };

  const isSlotSelected = (day: string, slot: string) => {
    return availability.find((a) => a.day === day)?.timeSlots.includes(slot) || false;
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await updateUser({
        trainingStyle,
        interestTags: selectedTags,
        availability,
      });
      router.replace('/(tabs)/feed');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.progressContainer}>
        <ProgressBar progress={1} color={theme.colors.primary} style={styles.progress} />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Stap 3 van 3
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Training voorkeuren
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Bijna klaar! Vertel ons meer over je trainingsstijl
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Training split
          </Text>
          <View style={styles.chipContainer}>
            {TRAINING_STYLES.map((style) => (
              <Chip
                key={style.value}
                selected={trainingStyle === style.value}
                onPress={() => setTrainingStyle(style.value)}
                style={styles.chip}
                showSelectedOverlay
              >
                {style.label}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Interesses
          </Text>
          <View style={styles.chipContainer}>
            {INTEREST_TAGS.map((tag) => (
              <Chip
                key={tag.value}
                selected={selectedTags.includes(tag.value)}
                onPress={() => toggleTag(tag.value)}
                style={styles.chip}
                showSelectedOverlay
              >
                {tag.label}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Beschikbaarheid
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
            Wanneer train je meestal?
          </Text>
          
          {WEEKDAYS.map((day) => (
            <View key={day.value} style={styles.dayRow}>
              <Text variant="bodyMedium" style={styles.dayLabel}>
                {day.label}
              </Text>
              <View style={styles.slotsContainer}>
                {TIME_SLOTS.slice(0, 3).map((slot) => (
                  <Chip
                    key={slot.value}
                    selected={isSlotSelected(day.value, slot.value)}
                    onPress={() => toggleDaySlot(day.value, slot.value)}
                    compact
                    style={styles.slotChip}
                    textStyle={styles.slotChipText}
                  >
                    {slot.value === 'early_morning' ? '☀️' : slot.value === 'morning' ? '🌤️' : slot.value === 'afternoon' ? '☀️' : slot.value === 'evening' ? '🌙' : '🌑'}
                  </Chip>
                ))}
                {TIME_SLOTS.slice(3).map((slot) => (
                  <Chip
                    key={slot.value}
                    selected={isSlotSelected(day.value, slot.value)}
                    onPress={() => toggleDaySlot(day.value, slot.value)}
                    compact
                    style={styles.slotChip}
                    textStyle={styles.slotChipText}
                  >
                    {slot.value === 'evening' ? '🌙' : '🌑'}
                  </Chip>
                ))}
              </View>
            </View>
          ))}
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
          onPress={handleComplete}
          loading={loading}
          disabled={loading}
          style={[styles.button, styles.nextButton]}
          contentStyle={styles.buttonContent}
        >
          Voltooien
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
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 4,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayLabel: {
    width: 32,
    fontWeight: '500',
  },
  slotsContainer: {
    flexDirection: 'row',
    flex: 1,
    gap: 4,
    marginLeft: 8,
  },
  slotChip: {
    height: 32,
  },
  slotChipText: {
    fontSize: 12,
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
