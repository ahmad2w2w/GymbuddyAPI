import express from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../lib/auth.js';
import { z } from 'zod';

const router = express.Router();

// XP values
const XP_VALUES = {
  CHECK_IN: 10,
  WORKOUT_WITH_BUDDY: 25,
  NEW_MATCH: 50,
  STREAK_7_DAYS: 100,
  STREAK_30_DAYS: 500,
  FIRST_SESSION: 25,
  HOST_SESSION: 15,
};

// Level thresholds
const LEVELS = [
  { id: 'newbie', minXp: 0 },
  { id: 'regular', minXp: 100 },
  { id: 'gym_rat', minXp: 500 },
  { id: 'legend', minXp: 2000 },
];

// Helper: Calculate level from XP
function getLevelFromXp(xp: number): string {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      return LEVELS[i].id;
    }
  }
  return 'newbie';
}

// Helper: Check if streak is valid (within 36 hours)
function isStreakValid(lastCheckIn: Date | null): boolean {
  if (!lastCheckIn) return false;
  const now = new Date();
  const hoursDiff = (now.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60);
  return hoursDiff <= 36;
}

// Helper: Check and award badges based on user stats
function checkBadges(
  currentBadges: string[],
  stats: {
    totalWorkouts: number;
    currentStreak: number;
    longestStreak: number;
    totalMatches?: number;
    sessionsHosted?: number;
    earlyBirdCount?: number;
    nightOwlCount?: number;
  }
): string[] {
  const newBadges = [...currentBadges];
  
  // Streak badges
  if (stats.currentStreak >= 3 && !newBadges.includes('streak_3')) {
    newBadges.push('streak_3');
  }
  if (stats.currentStreak >= 7 && !newBadges.includes('streak_7')) {
    newBadges.push('streak_7');
  }
  if (stats.currentStreak >= 14 && !newBadges.includes('streak_14')) {
    newBadges.push('streak_14');
  }
  if (stats.currentStreak >= 30 && !newBadges.includes('streak_30')) {
    newBadges.push('streak_30');
  }
  
  // Workout count badges
  if (stats.totalWorkouts >= 10 && !newBadges.includes('workouts_10')) {
    newBadges.push('workouts_10');
  }
  if (stats.totalWorkouts >= 50 && !newBadges.includes('workouts_50')) {
    newBadges.push('workouts_50');
  }
  if (stats.totalWorkouts >= 100 && !newBadges.includes('workouts_100')) {
    newBadges.push('workouts_100');
  }
  
  // Social badges
  if (stats.totalMatches && stats.totalMatches >= 1 && !newBadges.includes('first_match')) {
    newBadges.push('first_match');
  }
  if (stats.totalMatches && stats.totalMatches >= 5 && !newBadges.includes('social_5')) {
    newBadges.push('social_5');
  }
  if (stats.totalMatches && stats.totalMatches >= 10 && !newBadges.includes('social_10')) {
    newBadges.push('social_10');
  }
  
  // Session badges
  if (stats.sessionsHosted && stats.sessionsHosted >= 1 && !newBadges.includes('first_session')) {
    newBadges.push('first_session');
  }
  if (stats.sessionsHosted && stats.sessionsHosted >= 5 && !newBadges.includes('host_5')) {
    newBadges.push('host_5');
  }
  
  // Time-based badges
  if (stats.earlyBirdCount && stats.earlyBirdCount >= 10 && !newBadges.includes('early_bird')) {
    newBadges.push('early_bird');
  }
  if (stats.nightOwlCount && stats.nightOwlCount >= 10 && !newBadges.includes('night_owl')) {
    newBadges.push('night_owl');
  }
  
  return newBadges;
}

// POST /gamification/check-in - Daily workout check-in
router.post('/check-in', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { gymName, workoutType, note } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingCheckIn = await prisma.checkIn.findFirst({
      where: {
        userId,
        createdAt: { gte: today },
      },
    });
    
    if (existingCheckIn) {
      return res.status(400).json({ 
        success: false, 
        error: 'Je hebt vandaag al ingecheckt!',
        data: { alreadyCheckedIn: true }
      });
    }
    
    // Calculate streak
    let newStreak = 1;
    if (isStreakValid(user.lastCheckIn)) {
      newStreak = user.currentStreak + 1;
    }
    
    const longestStreak = Math.max(user.longestStreak, newStreak);
    
    // Calculate XP earned
    let xpEarned = XP_VALUES.CHECK_IN;
    
    // Bonus XP for streaks
    if (newStreak === 7) xpEarned += XP_VALUES.STREAK_7_DAYS;
    if (newStreak === 30) xpEarned += XP_VALUES.STREAK_30_DAYS;
    
    const newXp = user.xp + xpEarned;
    const newLevel = getLevelFromXp(newXp);
    const totalWorkouts = user.totalWorkouts + 1;
    
    // Check for new badges
    const currentBadges = JSON.parse(user.badges || '[]');
    
    // Count early bird / night owl check-ins
    const hour = new Date().getHours();
    const isEarlyBird = hour < 7;
    const isNightOwl = hour >= 21;
    
    // Get counts for time-based badges
    const earlyBirdCount = await prisma.checkIn.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(7, 0, 0, 0)),
        },
      },
    }) + (isEarlyBird ? 1 : 0);
    
    const nightOwlCount = await prisma.checkIn.count({
      where: {
        userId,
        createdAt: {
          gte: new Date(new Date().setHours(21, 0, 0, 0)),
        },
      },
    }) + (isNightOwl ? 1 : 0);
    
    // Get match count
    const totalMatches = await prisma.match.count({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    });
    
    // Get sessions hosted
    const sessionsHosted = await prisma.session.count({
      where: { ownerId: userId },
    });
    
    const newBadges = checkBadges(currentBadges, {
      totalWorkouts,
      currentStreak: newStreak,
      longestStreak,
      totalMatches,
      sessionsHosted,
      earlyBirdCount,
      nightOwlCount,
    });
    
    const badgesEarned = newBadges.filter(b => !currentBadges.includes(b));
    
    // Create check-in and update user in transaction
    const [checkIn] = await prisma.$transaction([
      prisma.checkIn.create({
        data: {
          userId,
          gymName: gymName || user.gymName,
          workoutType,
          note,
          xpEarned,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          xp: newXp,
          fitnessLevel: newLevel,
          currentStreak: newStreak,
          longestStreak,
          lastCheckIn: new Date(),
          totalWorkouts,
          badges: JSON.stringify(newBadges),
        },
      }),
    ]);
    
    res.json({
      success: true,
      data: {
        checkIn: {
          id: checkIn.id,
          xpEarned,
          createdAt: checkIn.createdAt,
        },
        stats: {
          xp: newXp,
          level: newLevel,
          currentStreak: newStreak,
          longestStreak,
          totalWorkouts,
        },
        badgesEarned,
        levelUp: newLevel !== user.fitnessLevel ? newLevel : null,
      },
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, error: 'Check-in failed' });
  }
});

// GET /gamification/stats - Get user's gamification stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        xp: true,
        fitnessLevel: true,
        currentStreak: true,
        longestStreak: true,
        lastCheckIn: true,
        totalWorkouts: true,
        badges: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Check if streak is still valid
    const streakValid = isStreakValid(user.lastCheckIn);
    const currentStreak = streakValid ? user.currentStreak : 0;
    
    // If streak expired, update it
    if (!streakValid && user.currentStreak > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { currentStreak: 0 },
      });
    }
    
    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCheckIn = await prisma.checkIn.findFirst({
      where: {
        userId,
        createdAt: { gte: today },
      },
    });
    
    // Get recent check-ins
    const recentCheckIns = await prisma.checkIn.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 7,
    });
    
    // Calculate level progress
    const currentLevelIndex = LEVELS.findIndex(l => l.id === user.fitnessLevel);
    const nextLevel = LEVELS[currentLevelIndex + 1];
    
    let levelProgress = 1;
    let xpToNextLevel = 0;
    
    if (nextLevel) {
      const currentLevelXp = LEVELS[currentLevelIndex].minXp;
      const xpInLevel = user.xp - currentLevelXp;
      const xpNeeded = nextLevel.minXp - currentLevelXp;
      levelProgress = xpInLevel / xpNeeded;
      xpToNextLevel = nextLevel.minXp - user.xp;
    }
    
    res.json({
      success: true,
      data: {
        xp: user.xp,
        level: user.fitnessLevel,
        levelProgress,
        xpToNextLevel,
        currentStreak,
        longestStreak: user.longestStreak,
        totalWorkouts: user.totalWorkouts,
        badges: JSON.parse(user.badges || '[]'),
        checkedInToday: !!todayCheckIn,
        lastCheckIn: user.lastCheckIn,
        recentCheckIns: recentCheckIns.map(c => ({
          id: c.id,
          workoutType: c.workoutType,
          xpEarned: c.xpEarned,
          createdAt: c.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
});

// GET /gamification/leaderboard - Get top users
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const topUsers = await prisma.user.findMany({
      orderBy: { xp: 'desc' },
      take: 20,
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        xp: true,
        fitnessLevel: true,
        currentStreak: true,
      },
    });
    
    res.json({
      success: true,
      data: topUsers.map((u, index) => ({
        rank: index + 1,
        ...u,
      })),
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to get leaderboard' });
  }
});

export default router;
