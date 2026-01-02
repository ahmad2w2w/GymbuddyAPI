// Goals
export const GOALS = [
  { value: 'muscle_building', label: 'Spieropbouw' },
  { value: 'weight_loss', label: 'Afvallen' },
  { value: 'conditioning', label: 'Conditie' },
  { value: 'powerlifting', label: 'Powerlifting' },
  { value: 'bodybuilding', label: 'Bodybuilding' },
  { value: 'calisthenics', label: 'Calisthenics' },
  { value: 'crossfit', label: 'CrossFit' },
  { value: 'general_fitness', label: 'Algemene Fitness' },
] as const;

// Levels
export const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Gemiddeld' },
  { value: 'advanced', label: 'Gevorderd' },
] as const;

// Training Styles
export const TRAINING_STYLES = [
  { value: 'push_pull_legs', label: 'Push/Pull/Legs' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'upper_lower', label: 'Upper/Lower' },
  { value: 'bro_split', label: 'Bro Split' },
  { value: 'arnold_split', label: 'Arnold Split' },
  { value: 'custom', label: 'Custom' },
] as const;

// Workout Types
export const WORKOUT_TYPES = [
  { value: 'push', label: 'Push' },
  { value: 'pull', label: 'Pull' },
  { value: 'legs', label: 'Legs' },
  { value: 'upper', label: 'Upper Body' },
  { value: 'lower', label: 'Lower Body' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'strength', label: 'Strength' },
  { value: 'hypertrophy', label: 'Hypertrophy' },
] as const;

// Intensity
export const INTENSITIES = [
  { value: 'low', label: 'Licht' },
  { value: 'medium', label: 'Gemiddeld' },
  { value: 'high', label: 'Intensief' },
] as const;

// Interest Tags
export const INTEREST_TAGS = [
  { value: 'bench_press', label: 'Bench Press' },
  { value: 'squat', label: 'Squat' },
  { value: 'deadlift', label: 'Deadlift' },
  { value: 'olympic_lifts', label: 'Olympic Lifts' },
  { value: 'calisthenics', label: 'Calisthenics' },
  { value: 'running', label: 'Hardlopen' },
  { value: 'swimming', label: 'Zwemmen' },
  { value: 'cycling', label: 'Fietsen' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'stretching', label: 'Stretching' },
  { value: 'core', label: 'Core' },
  { value: 'arms', label: 'Armen' },
  { value: 'shoulders', label: 'Schouders' },
  { value: 'back', label: 'Rug' },
  { value: 'chest', label: 'Borst' },
] as const;

// Weekdays
export const WEEKDAYS = [
  { value: 'monday', label: 'Ma' },
  { value: 'tuesday', label: 'Di' },
  { value: 'wednesday', label: 'Wo' },
  { value: 'thursday', label: 'Do' },
  { value: 'friday', label: 'Vr' },
  { value: 'saturday', label: 'Za' },
  { value: 'sunday', label: 'Zo' },
] as const;

// Time Slots
export const TIME_SLOTS = [
  { value: 'early_morning', label: 'Vroege ochtend (6-9u)' },
  { value: 'morning', label: 'Ochtend (9-12u)' },
  { value: 'afternoon', label: 'Middag (12-17u)' },
  { value: 'evening', label: 'Avond (17-21u)' },
  { value: 'late_evening', label: 'Late avond (21-24u)' },
] as const;

// Age Ranges
export const AGE_RANGES = [
  { value: '18-24', label: '18-24' },
  { value: '25-34', label: '25-34' },
  { value: '35-44', label: '35-44' },
  { value: '45-54', label: '45-54' },
  { value: '55+', label: '55+' },
] as const;

// Helper to get label by value
export const getLabel = (items: readonly { value: string; label: string }[], value: string) => {
  return items.find((item) => item.value === value)?.label || value;
};



