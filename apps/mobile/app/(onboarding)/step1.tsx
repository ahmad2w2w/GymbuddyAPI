import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, Chip, ProgressBar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { GOALS, LEVELS } from '@/lib/constants';

export default function OnboardingStep1() {
  const router = useRouter();
  const theme = useTheme();
  const { user, updateUser } = useAuth();

  const [bio, setBio] = useState(user?.bio || '');
  const [selectedGoals, setSelectedGoals] = useState<string[]>(user?.goals || []);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(user?.level || null);
  const [loading, setLoading] = useState(false);

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleNext = async () => {
    if (selectedGoals.length === 0 || !selectedLevel) {
      return;
    }

    setLoading(true);
    try {
      await updateUser({
        bio: bio || null,
        goals: selectedGoals,
        level: selectedLevel,
      });
      router.push('/(onboarding)/step2');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.progressContainer}>
        <ProgressBar progress={0.33} color={theme.colors.primary} style={styles.progress} />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Stap 1 van 3
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Over jou
          </Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Vertel iets over jezelf en je trainingsdoelen
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Bio (optioneel)
          </Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Vertel iets over jezelf..."
            multiline
            numberOfLines={3}
            mode="outlined"
            style={styles.bioInput}
          />
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Wat zijn je doelen? *
          </Text>
          <View style={styles.chipContainer}>
            {GOALS.map((goal) => (
              <Chip
                key={goal.value}
                selected={selectedGoals.includes(goal.value)}
                onPress={() => toggleGoal(goal.value)}
                style={styles.chip}
                showSelectedOverlay
              >
                {goal.label}
              </Chip>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Wat is je niveau? *
          </Text>
          <View style={styles.chipContainer}>
            {LEVELS.map((level) => (
              <Chip
                key={level.value}
                selected={selectedLevel === level.value}
                onPress={() => setSelectedLevel(level.value)}
                style={styles.chip}
                showSelectedOverlay
              >
                {level.label}
              </Chip>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleNext}
          loading={loading}
          disabled={loading || selectedGoals.length === 0 || !selectedLevel}
          style={styles.button}
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
  bioInput: {
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
  footer: {
    padding: 24,
    paddingTop: 16,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});



