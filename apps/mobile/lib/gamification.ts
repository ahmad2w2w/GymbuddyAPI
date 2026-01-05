// Gamification constants for GymBuddy

// XP values for different actions
export const XP_VALUES = {
  CHECK_IN: 10,
  WORKOUT_WITH_BUDDY: 25,
  NEW_MATCH: 50,
  STREAK_7_DAYS: 100,
  STREAK_30_DAYS: 500,
  FIRST_SESSION: 25,
  HOST_SESSION: 15,
  JOIN_SESSION: 20,
  COMPLETE_PROFILE: 50,
};

// Level thresholds
export const LEVELS = [
  { id: 'newbie', name: 'Gym Newbie', minXp: 0, icon: '🥉', color: '#CD7F32' },
  { id: 'regular', name: 'Regular', minXp: 100, icon: '🥈', color: '#C0C0C0' },
  { id: 'gym_rat', name: 'Gym Rat', minXp: 500, icon: '🥇', color: '#FFD700' },
  { id: 'legend', name: 'Legend', minXp: 2000, icon: '💎', color: '#00D4FF' },
] as const;

export type LevelId = typeof LEVELS[number]['id'];

// Get level info from XP
export function getLevelFromXp(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
}

// Get progress to next level (0-1)
export function getLevelProgress(xp: number): number {
  const currentLevel = getLevelFromXp(xp);
  const currentIndex = LEVELS.findIndex(l => l.id === currentLevel.id);
  
  if (currentIndex === LEVELS.length - 1) {
    return 1; // Max level
  }
  
  const nextLevel = LEVELS[currentIndex + 1];
  const xpInLevel = xp - currentLevel.minXp;
  const xpNeeded = nextLevel.minXp - currentLevel.minXp;
  
  return xpInLevel / xpNeeded;
}

// Badge definitions
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'streak' | 'social' | 'workout' | 'special';
  requirement: string;
}

export const BADGES: Badge[] = [
  // Streak badges
  {
    id: 'streak_3',
    name: 'Getting Started',
    description: '3 dagen streak',
    icon: 'fire',
    color: '#FF6B35',
    category: 'streak',
    requirement: '3 dagen op rij trainen',
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7 dagen streak',
    icon: 'fire',
    color: '#FF3D00',
    category: 'streak',
    requirement: '7 dagen op rij trainen',
  },
  {
    id: 'streak_14',
    name: 'Two Week Terror',
    description: '14 dagen streak',
    icon: 'fire',
    color: '#FF1744',
    category: 'streak',
    requirement: '14 dagen op rij trainen',
  },
  {
    id: 'streak_30',
    name: 'Iron Will',
    description: '30 dagen streak',
    icon: 'fire',
    color: '#D500F9',
    category: 'streak',
    requirement: '30 dagen op rij trainen',
  },
  
  // Time-based badges
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: '10x voor 7:00 getraind',
    icon: 'weather-sunset-up',
    color: '#FFB300',
    category: 'workout',
    requirement: '10 keer voor 7:00 check-in',
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: '10x na 21:00 getraind',
    icon: 'weather-night',
    color: '#5C6BC0',
    category: 'workout',
    requirement: '10 keer na 21:00 check-in',
  },
  
  // Social badges
  {
    id: 'first_match',
    name: 'First Connection',
    description: 'Eerste match!',
    icon: 'handshake',
    color: '#00C853',
    category: 'social',
    requirement: 'Maak je eerste match',
  },
  {
    id: 'social_5',
    name: 'Social Starter',
    description: '5 matches',
    icon: 'account-group',
    color: '#00B0FF',
    category: 'social',
    requirement: '5 gym buddies matchen',
  },
  {
    id: 'social_10',
    name: 'Social Butterfly',
    description: '10 matches',
    icon: 'account-multiple-check',
    color: '#7C4DFF',
    category: 'social',
    requirement: '10 gym buddies matchen',
  },
  {
    id: 'buddy_workout',
    name: 'Better Together',
    description: 'Train met een buddy',
    icon: 'account-heart',
    color: '#E91E63',
    category: 'social',
    requirement: 'Voltooi een workout met een match',
  },
  
  // Workout count badges
  {
    id: 'workouts_10',
    name: 'Dedicated',
    description: '10 workouts voltooid',
    icon: 'dumbbell',
    color: '#00C853',
    category: 'workout',
    requirement: '10 workouts loggen',
  },
  {
    id: 'workouts_50',
    name: 'Consistent',
    description: '50 workouts voltooid',
    icon: 'arm-flex',
    color: '#FF6B35',
    category: 'workout',
    requirement: '50 workouts loggen',
  },
  {
    id: 'workouts_100',
    name: 'Centurion',
    description: '100 workouts voltooid',
    icon: 'trophy',
    color: '#FFD700',
    category: 'workout',
    requirement: '100 workouts loggen',
  },
  
  // Special badges
  {
    id: 'first_session',
    name: 'Session Starter',
    description: 'Eerste sessie aangemaakt',
    icon: 'calendar-plus',
    color: '#00B0FF',
    category: 'special',
    requirement: 'Maak je eerste training sessie',
  },
  {
    id: 'host_5',
    name: 'Community Builder',
    description: '5 sessies gehost',
    icon: 'account-star',
    color: '#7C4DFF',
    category: 'special',
    requirement: 'Host 5 training sessies',
  },
  {
    id: 'profile_complete',
    name: 'All Set',
    description: 'Profiel 100% compleet',
    icon: 'check-circle',
    color: '#00C853',
    category: 'special',
    requirement: 'Vul je hele profiel in',
  },
];

// Get badge by ID
export function getBadge(id: string): Badge | undefined {
  return BADGES.find(b => b.id === id);
}

// Get badges by category
export function getBadgesByCategory(category: Badge['category']): Badge[] {
  return BADGES.filter(b => b.category === category);
}

// Check if user has badge
export function hasBadge(userBadges: string[], badgeId: string): boolean {
  return userBadges.includes(badgeId);
}

// Streak helper - check if streak is still valid (within 36 hours to be lenient)
export function isStreakValid(lastCheckIn: Date | string | null): boolean {
  if (!lastCheckIn) return false;
  
  const last = new Date(lastCheckIn);
  const now = new Date();
  const hoursDiff = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
  
  return hoursDiff <= 36; // 36 hours grace period
}

// Format streak display
export function formatStreak(streak: number): string {
  if (streak === 0) return 'Start vandaag!';
  if (streak === 1) return '1 dag';
  return `${streak} dagen`;
}

// Get streak flame color based on streak length
export function getStreakColor(streak: number): string {
  if (streak >= 30) return '#D500F9'; // Purple for 30+
  if (streak >= 14) return '#FF1744'; // Red for 14+
  if (streak >= 7) return '#FF3D00'; // Orange-red for 7+
  if (streak >= 3) return '#FF6B35'; // Orange for 3+
  return '#757575'; // Gray for 0-2
}

// Calculate flames to show based on streak
export function getStreakFlames(streak: number): number {
  if (streak >= 30) return 4;
  if (streak >= 14) return 3;
  if (streak >= 7) return 2;
  if (streak >= 1) return 1;
  return 0;
}

