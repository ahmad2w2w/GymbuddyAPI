import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../lib/auth.js';

const router = Router();

// =====================================================
// WORKOUT ROULETTE
// =====================================================

const WORKOUT_CATEGORIES = {
  push: {
    name: 'Push Day',
    icon: 'arm-flex',
    color: '#FF6B35',
    exercises: [
      { name: 'Bench Press', sets: '4x8-10', muscle: 'Chest' },
      { name: 'Overhead Press', sets: '4x8-10', muscle: 'Shoulders' },
      { name: 'Incline Dumbbell Press', sets: '3x10-12', muscle: 'Upper Chest' },
      { name: 'Lateral Raises', sets: '3x12-15', muscle: 'Side Delts' },
      { name: 'Tricep Pushdowns', sets: '3x12-15', muscle: 'Triceps' },
      { name: 'Dips', sets: '3x10-12', muscle: 'Chest/Triceps' },
    ]
  },
  pull: {
    name: 'Pull Day',
    icon: 'weight-lifter',
    color: '#4ECDC4',
    exercises: [
      { name: 'Deadlift', sets: '4x5-6', muscle: 'Back/Hamstrings' },
      { name: 'Pull-ups', sets: '4x8-10', muscle: 'Lats' },
      { name: 'Barbell Rows', sets: '4x8-10', muscle: 'Back' },
      { name: 'Face Pulls', sets: '3x15-20', muscle: 'Rear Delts' },
      { name: 'Bicep Curls', sets: '3x10-12', muscle: 'Biceps' },
      { name: 'Hammer Curls', sets: '3x10-12', muscle: 'Forearms' },
    ]
  },
  legs: {
    name: 'Leg Day',
    icon: 'run-fast',
    color: '#9B59B6',
    exercises: [
      { name: 'Squats', sets: '4x8-10', muscle: 'Quads/Glutes' },
      { name: 'Romanian Deadlift', sets: '4x10-12', muscle: 'Hamstrings' },
      { name: 'Leg Press', sets: '3x12-15', muscle: 'Quads' },
      { name: 'Walking Lunges', sets: '3x12 each', muscle: 'Legs' },
      { name: 'Leg Curls', sets: '3x12-15', muscle: 'Hamstrings' },
      { name: 'Calf Raises', sets: '4x15-20', muscle: 'Calves' },
    ]
  },
  cardio: {
    name: 'Cardio',
    icon: 'heart-pulse',
    color: '#E74C3C',
    exercises: [
      { name: 'HIIT Sprints', sets: '10x30sec', muscle: 'Full Body' },
      { name: 'Jump Rope', sets: '3x3min', muscle: 'Full Body' },
      { name: 'Rowing Machine', sets: '20min', muscle: 'Full Body' },
      { name: 'Stair Climber', sets: '15min', muscle: 'Legs' },
      { name: 'Battle Ropes', sets: '5x1min', muscle: 'Arms/Core' },
      { name: 'Burpees', sets: '4x15', muscle: 'Full Body' },
    ]
  },
  core: {
    name: 'Core Day',
    icon: 'human',
    color: '#F39C12',
    exercises: [
      { name: 'Plank', sets: '3x60sec', muscle: 'Core' },
      { name: 'Russian Twists', sets: '3x20', muscle: 'Obliques' },
      { name: 'Hanging Leg Raises', sets: '3x12', muscle: 'Lower Abs' },
      { name: 'Ab Wheel Rollouts', sets: '3x10', muscle: 'Core' },
      { name: 'Cable Crunches', sets: '3x15', muscle: 'Upper Abs' },
      { name: 'Dead Bug', sets: '3x10 each', muscle: 'Core Stability' },
    ]
  },
  full_body: {
    name: 'Full Body',
    icon: 'dumbbell',
    color: '#1ABC9C',
    exercises: [
      { name: 'Squats', sets: '3x8', muscle: 'Legs' },
      { name: 'Bench Press', sets: '3x8', muscle: 'Chest' },
      { name: 'Rows', sets: '3x8', muscle: 'Back' },
      { name: 'Overhead Press', sets: '3x8', muscle: 'Shoulders' },
      { name: 'Romanian Deadlift', sets: '3x10', muscle: 'Hamstrings' },
      { name: 'Pull-ups/Lat Pulldown', sets: '3x8', muscle: 'Lats' },
    ]
  }
};

// GET /features/roulette/spin - Get random workout
router.get('/roulette/spin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const categories = Object.keys(WORKOUT_CATEGORIES);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)] as keyof typeof WORKOUT_CATEGORIES;
    const workout = WORKOUT_CATEGORIES[randomCategory];
    
    // Shuffle exercises and pick 4-6
    const shuffled = [...workout.exercises].sort(() => Math.random() - 0.5);
    const selectedExercises = shuffled.slice(0, Math.floor(Math.random() * 3) + 4);
    
    // Add estimated duration
    const estimatedMinutes = selectedExercises.length * 8 + 10; // warmup
    
    res.json({
      success: true,
      data: {
        category: randomCategory,
        name: workout.name,
        icon: workout.icon,
        color: workout.color,
        exercises: selectedExercises,
        estimatedMinutes,
        xpReward: 25
      }
    });
  } catch (error) {
    console.error('Roulette spin error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// GET /features/roulette/categories - Get all workout categories
router.get('/roulette/categories', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const categories = Object.entries(WORKOUT_CATEGORIES).map(([key, value]) => ({
      id: key,
      name: value.name,
      icon: value.icon,
      color: value.color,
      exerciseCount: value.exercises.length
    }));
    
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// =====================================================
// BUDDY STREAKS
// =====================================================

// GET /features/streaks - Get all buddy streaks for current user
router.get('/streaks', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Get all streaks where user is involved
    const streaks = await prisma.buddyStreak.findMany({
      where: {
        OR: [
          { userAId: userId },
          { userBId: userId }
        ]
      },
      orderBy: { currentStreak: 'desc' }
    });
    
    // Get buddy info for each streak
    const buddyIds = streaks.map(s => s.userAId === userId ? s.userBId : s.userAId);
    const buddies = await prisma.user.findMany({
      where: { id: { in: buddyIds } },
      select: { id: true, name: true, avatarUrl: true }
    });
    
    const buddyMap = new Map(buddies.map(b => [b.id, b]));
    
    const result = streaks.map(streak => {
      const buddyId = streak.userAId === userId ? streak.userBId : streak.userAId;
      const buddy = buddyMap.get(buddyId);
      return {
        id: streak.id,
        buddy: buddy || { id: buddyId, name: 'Onbekend', avatarUrl: null },
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        totalWorkouts: streak.totalWorkouts,
        lastWorkout: streak.lastWorkout?.toISOString() || null
      };
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get streaks error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// POST /features/streaks/:matchId/workout - Log a workout with buddy
router.post('/streaks/:matchId/workout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { matchId } = req.params;
    
    // Verify match exists
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [
          { userAId: userId },
          { userBId: userId }
        ]
      }
    });
    
    if (!match) {
      return res.status(404).json({ success: false, error: 'Match niet gevonden' });
    }
    
    const buddyId = match.userAId === userId ? match.userBId : match.userAId;
    
    // Order IDs consistently for unique constraint
    const [userAId, userBId] = [userId, buddyId].sort();
    
    // Get or create streak
    let streak = await prisma.buddyStreak.findUnique({
      where: { userAId_userBId: { userAId, userBId } }
    });
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    if (streak) {
      // Check if streak should continue or reset
      let newStreak = streak.currentStreak;
      
      if (streak.lastWorkout && streak.lastWorkout > oneDayAgo) {
        // Already logged today, don't increase
        return res.json({
          success: true,
          data: {
            message: 'Al gelogd vandaag!',
            currentStreak: streak.currentStreak,
            xpEarned: 0
          }
        });
      } else if (streak.lastWorkout && streak.lastWorkout > twoDaysAgo) {
        // Continue streak
        newStreak += 1;
      } else {
        // Reset streak
        newStreak = 1;
      }
      
      const longestStreak = Math.max(newStreak, streak.longestStreak);
      
      streak = await prisma.buddyStreak.update({
        where: { id: streak.id },
        data: {
          currentStreak: newStreak,
          longestStreak,
          totalWorkouts: streak.totalWorkouts + 1,
          lastWorkout: now
        }
      });
    } else {
      // Create new streak
      streak = await prisma.buddyStreak.create({
        data: {
          userAId,
          userBId,
          currentStreak: 1,
          longestStreak: 1,
          totalWorkouts: 1,
          lastWorkout: now
        }
      });
    }
    
    // Award XP based on streak
    let xpEarned = 15; // base
    if (streak.currentStreak >= 7) xpEarned += 10;
    if (streak.currentStreak >= 30) xpEarned += 25;
    
    await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: xpEarned } }
    });
    
    res.json({
      success: true,
      data: {
        message: `🔥 ${streak.currentStreak} dag streak met je buddy!`,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        xpEarned
      }
    });
  } catch (error) {
    console.error('Log buddy workout error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// =====================================================
// LIVE TRAINING STATUS
// =====================================================

// GET /features/training/live - Get users training now (nearby)
router.get('/training/live', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radiusKm = parseFloat(req.query.radiusKm as string) || 10;
    
    // Get all live training sessions
    const liveTrainings = await prisma.liveTraining.findMany({
      where: {
        userId: { not: userId } // Exclude self
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            fitnessLevel: true
          }
        }
      }
    });
    
    // Filter by distance if lat/lng provided
    let filtered = liveTrainings;
    if (lat && lng) {
      filtered = liveTrainings.filter(training => {
        const distance = calculateDistance(lat, lng, training.lat, training.lng);
        return distance <= radiusKm;
      });
    }
    
    // Check privacy settings and if user is blocked
    const blocks = await prisma.block.findMany({
      where: {
        OR: [
          { blockerId: userId },
          { blockedId: userId }
        ]
      }
    });
    const blockedIds = new Set([
      ...blocks.map(b => b.blockerId),
      ...blocks.map(b => b.blockedId)
    ]);
    
    filtered = filtered.filter(t => !blockedIds.has(t.userId));
    
    const result = filtered.map(training => ({
      id: training.id,
      user: training.user,
      gymName: training.gymName,
      workoutType: training.workoutType,
      startedAt: training.startedAt.toISOString(),
      estimatedEnd: training.estimatedEnd?.toISOString(),
      note: training.note,
      lat: training.lat,
      lng: training.lng,
      distance: lat && lng ? calculateDistance(lat, lng, training.lat, training.lng) : null
    }));
    
    res.json({
      success: true,
      data: result.sort((a, b) => (a.distance || 0) - (b.distance || 0))
    });
  } catch (error) {
    console.error('Get live training error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// POST /features/training/start - Start training
router.post('/training/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { gymName, gymAddress, lat, lng, workoutType, durationMinutes, note } = req.body;
    
    if (!gymName || !lat || !lng || !workoutType) {
      return res.status(400).json({ success: false, error: 'Gym, locatie en workout type vereist' });
    }
    
    // Delete any existing live training for this user
    await prisma.liveTraining.deleteMany({
      where: { userId }
    });
    
    const estimatedEnd = durationMinutes 
      ? new Date(Date.now() + durationMinutes * 60 * 1000)
      : null;
    
    const training = await prisma.liveTraining.create({
      data: {
        userId,
        gymName,
        gymAddress,
        lat,
        lng,
        workoutType,
        estimatedEnd,
        note
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true }
        }
      }
    });
    
    res.json({
      success: true,
      data: {
        id: training.id,
        message: `🏋️ Je bent nu aan het trainen bij ${gymName}!`,
        training: {
          ...training,
          startedAt: training.startedAt.toISOString(),
          estimatedEnd: training.estimatedEnd?.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Start training error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// POST /features/training/stop - Stop training
router.post('/training/stop', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const deleted = await prisma.liveTraining.deleteMany({
      where: { userId }
    });
    
    if (deleted.count === 0) {
      return res.status(404).json({ success: false, error: 'Geen actieve training gevonden' });
    }
    
    // Award XP for completing workout
    await prisma.user.update({
      where: { id: userId },
      data: { 
        xp: { increment: 10 },
        totalWorkouts: { increment: 1 }
      }
    });
    
    res.json({
      success: true,
      data: {
        message: '💪 Training beëindigd! +10 XP',
        xpEarned: 10
      }
    });
  } catch (error) {
    console.error('Stop training error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// GET /features/training/status - Get own training status
router.get('/training/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const training = await prisma.liveTraining.findUnique({
      where: { userId }
    });
    
    res.json({
      success: true,
      data: training ? {
        isTraining: true,
        ...training,
        startedAt: training.startedAt.toISOString(),
        estimatedEnd: training.estimatedEnd?.toISOString()
      } : {
        isTraining: false
      }
    });
  } catch (error) {
    console.error('Get training status error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// Helper function for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
}

export default router;
