import { calculateCompatibility, calculateDistance } from '../lib/utils';

// Mock user data
const createMockUser = (overrides: Partial<any> = {}) => ({
  id: 'test-id',
  email: 'test@example.com',
  passwordHash: 'hash',
  name: 'Test User',
  bio: null,
  avatarUrl: null,
  ageRange: '25-34',
  gymName: 'Basic-Fit Amsterdam',
  gymAddress: 'Test Street 1',
  lat: 52.3676,
  lng: 4.9041,
  preferredRadius: 10,
  goals: JSON.stringify(['muscle_building', 'powerlifting']),
  level: 'intermediate',
  trainingStyle: 'push_pull_legs',
  availability: JSON.stringify([
    { day: 'monday', timeSlots: ['evening'] },
    { day: 'wednesday', timeSlots: ['evening'] }
  ]),
  interestTags: JSON.stringify(['bench_press', 'squat', 'deadlift']),
  verificationScore: 80,
  isPremium: false,
  likesRemaining: 10,
  lastLikeReset: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

describe('calculateDistance', () => {
  it('should return 0 for same coordinates', () => {
    const distance = calculateDistance(52.3676, 4.9041, 52.3676, 4.9041);
    expect(distance).toBe(0);
  });

  it('should calculate correct distance between Amsterdam and Rotterdam', () => {
    // Amsterdam to Rotterdam is approximately 57 km
    const distance = calculateDistance(52.3676, 4.9041, 51.9244, 4.4777);
    expect(distance).toBeGreaterThan(50);
    expect(distance).toBeLessThan(65);
  });

  it('should return small distance for nearby locations', () => {
    // ~1 km apart
    const distance = calculateDistance(52.3676, 4.9041, 52.3766, 4.9141);
    expect(distance).toBeLessThan(2);
  });
});

describe('calculateCompatibility', () => {
  it('should return 100% for identical users', () => {
    const user1 = createMockUser();
    const user2 = createMockUser();
    const score = calculateCompatibility(user1, user2);
    expect(score).toBe(100);
  });

  it('should give bonus for same gym', () => {
    const user1 = createMockUser({ gymName: 'Basic-Fit' });
    const user2 = createMockUser({ gymName: 'Basic-Fit' });
    const sameGymScore = calculateCompatibility(user1, user2);

    const user3 = createMockUser({ gymName: 'SportCity' });
    const differentGymScore = calculateCompatibility(user1, user3);

    expect(sameGymScore).toBeGreaterThan(differentGymScore);
  });

  it('should consider goal overlap', () => {
    const user1 = createMockUser({
      goals: JSON.stringify(['muscle_building', 'powerlifting'])
    });
    const user2 = createMockUser({
      goals: JSON.stringify(['muscle_building', 'powerlifting'])
    });
    const user3 = createMockUser({
      goals: JSON.stringify(['cardio', 'weight_loss'])
    });

    const sameGoalsScore = calculateCompatibility(user1, user2);
    const differentGoalsScore = calculateCompatibility(user1, user3);

    expect(sameGoalsScore).toBeGreaterThan(differentGoalsScore);
  });

  it('should consider level compatibility', () => {
    const beginner = createMockUser({ level: 'beginner' });
    const intermediate = createMockUser({ level: 'intermediate' });
    const advanced = createMockUser({ level: 'advanced' });

    // Same level should score higher
    const sameLevelScore = calculateCompatibility(intermediate, createMockUser({ level: 'intermediate' }));
    
    // Adjacent levels should score reasonably
    const adjacentScore = calculateCompatibility(intermediate, beginner);
    
    // Far apart levels should score lower
    const farScore = calculateCompatibility(beginner, advanced);

    expect(sameLevelScore).toBeGreaterThanOrEqual(adjacentScore);
    expect(adjacentScore).toBeGreaterThanOrEqual(farScore);
  });

  it('should handle users with empty arrays', () => {
    const user1 = createMockUser({
      goals: JSON.stringify([]),
      interestTags: JSON.stringify([]),
      availability: JSON.stringify([])
    });
    const user2 = createMockUser();

    // Should not throw
    const score = calculateCompatibility(user1, user2);
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// Simple test runner for environments without Jest
if (typeof describe === 'undefined') {
  console.log('Running basic tests...');
  
  // Distance test
  const d1 = calculateDistance(52.3676, 4.9041, 52.3676, 4.9041);
  console.log(`Same location distance: ${d1} (expected: 0) - ${d1 === 0 ? '✓' : '✗'}`);
  
  // Compatibility test
  const u1 = createMockUser();
  const u2 = createMockUser();
  const score = calculateCompatibility(u1, u2);
  console.log(`Same user compatibility: ${score}% (expected: 100) - ${score === 100 ? '✓' : '✗'}`);
  
  console.log('Tests complete!');
}
