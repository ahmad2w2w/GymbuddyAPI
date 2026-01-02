// Goals
export const GOALS = [
  'muscle_building',
  'weight_loss', 
  'conditioning',
  'powerlifting',
  'bodybuilding',
  'calisthenics',
  'crossfit',
  'general_fitness'
] as const;

export const GOAL_LABELS: Record<typeof GOALS[number], string> = {
  muscle_building: 'Spieropbouw',
  weight_loss: 'Afvallen',
  conditioning: 'Conditie',
  powerlifting: 'Powerlifting',
  bodybuilding: 'Bodybuilding',
  calisthenics: 'Calisthenics',
  crossfit: 'CrossFit',
  general_fitness: 'Algemene Fitness'
};

// Levels
export const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

export const LEVEL_LABELS: Record<typeof LEVELS[number], string> = {
  beginner: 'Beginner',
  intermediate: 'Gemiddeld',
  advanced: 'Gevorderd'
};

// Training Styles
export const TRAINING_STYLES = [
  'push_pull_legs',
  'full_body',
  'upper_lower',
  'bro_split',
  'arnold_split',
  'custom'
] as const;

export const TRAINING_STYLE_LABELS: Record<typeof TRAINING_STYLES[number], string> = {
  push_pull_legs: 'Push/Pull/Legs',
  full_body: 'Full Body',
  upper_lower: 'Upper/Lower',
  bro_split: 'Bro Split',
  arnold_split: 'Arnold Split',
  custom: 'Custom'
};

// Workout Types
export const WORKOUT_TYPES = [
  'push',
  'pull',
  'legs',
  'upper',
  'lower',
  'full_body',
  'cardio',
  'hiit',
  'strength',
  'hypertrophy'
] as const;

export const WORKOUT_TYPE_LABELS: Record<typeof WORKOUT_TYPES[number], string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper Body',
  lower: 'Lower Body',
  full_body: 'Full Body',
  cardio: 'Cardio',
  hiit: 'HIIT',
  strength: 'Strength',
  hypertrophy: 'Hypertrophy'
};

// Intensity
export const INTENSITIES = ['low', 'medium', 'high'] as const;

export const INTENSITY_LABELS: Record<typeof INTENSITIES[number], string> = {
  low: 'Licht',
  medium: 'Gemiddeld',
  high: 'Intensief'
};

// Interest Tags
export const INTEREST_TAGS = [
  'bench_press',
  'squat',
  'deadlift',
  'olympic_lifts',
  'calisthenics',
  'running',
  'swimming',
  'cycling',
  'yoga',
  'stretching',
  'core',
  'arms',
  'shoulders',
  'back',
  'chest'
] as const;

export const INTEREST_TAG_LABELS: Record<typeof INTEREST_TAGS[number], string> = {
  bench_press: 'Bench Press',
  squat: 'Squat',
  deadlift: 'Deadlift',
  olympic_lifts: 'Olympic Lifts',
  calisthenics: 'Calisthenics',
  running: 'Hardlopen',
  swimming: 'Zwemmen',
  cycling: 'Fietsen',
  yoga: 'Yoga',
  stretching: 'Stretching',
  core: 'Core',
  arms: 'Armen',
  shoulders: 'Schouders',
  back: 'Rug',
  chest: 'Borst'
};

// Days of week
export const WEEKDAYS = [
  'monday',
  'tuesday', 
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
] as const;

export const WEEKDAY_LABELS: Record<typeof WEEKDAYS[number], string> = {
  monday: 'Maandag',
  tuesday: 'Dinsdag',
  wednesday: 'Woensdag',
  thursday: 'Donderdag',
  friday: 'Vrijdag',
  saturday: 'Zaterdag',
  sunday: 'Zondag'
};

// Time slots
export const TIME_SLOTS = [
  'early_morning',  // 6-9
  'morning',        // 9-12
  'afternoon',      // 12-17
  'evening',        // 17-21
  'late_evening'    // 21-24
] as const;

export const TIME_SLOT_LABELS: Record<typeof TIME_SLOTS[number], string> = {
  early_morning: 'Vroege ochtend (6-9u)',
  morning: 'Ochtend (9-12u)',
  afternoon: 'Middag (12-17u)',
  evening: 'Avond (17-21u)',
  late_evening: 'Late avond (21-24u)'
};

// Age ranges
export const AGE_RANGES = [
  '18-24',
  '25-34',
  '35-44',
  '45-54',
  '55+'
] as const;

// Join request status
export const JOIN_REQUEST_STATUS = ['pending', 'accepted', 'declined'] as const;



