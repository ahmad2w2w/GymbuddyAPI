import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../lib/auth.js';
import { calculateDistance, toUserProfile, calculateVerificationScore } from '../lib/utils.js';
import { z } from 'zod';

// Inline validators
const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  ageRange: z.string().optional().nullable(),
  gymName: z.string().max(100).optional().nullable(),
  gymAddress: z.string().max(200).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  preferredRadius: z.number().min(1).max(50).optional(),
  goals: z.array(z.string()).optional(),
  level: z.string().optional().nullable(),
  trainingStyle: z.string().optional().nullable(),
  availability: z.array(z.object({ day: z.string(), timeSlots: z.array(z.string()) })).optional(),
  interestTags: z.array(z.string()).optional()
});

const router = Router();

// GET /users/feed - Get users for swiping
router.get('/feed', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'Gebruiker niet gevonden' });
    }

    // Parse query params
    const lat = parseFloat(req.query.lat as string) || currentUser.lat || 52.3676;
    const lng = parseFloat(req.query.lng as string) || currentUser.lng || 4.9041;
    const radiusKm = parseFloat(req.query.radiusKm as string) || currentUser.preferredRadius || 10;
    const goals = req.query.goals ? (req.query.goals as string).split(',') : undefined;
    const level = req.query.level as string | undefined;
    const sameGymOnly = req.query.sameGymOnly === 'true';

    // Get users the current user has already liked, passed, or blocked
    const [likes, passes, blocks, blockedBy] = await Promise.all([
      prisma.like.findMany({
        where: { fromUserId: currentUser.id },
        select: { toUserId: true }
      }),
      prisma.pass.findMany({
        where: { fromUserId: currentUser.id },
        select: { toUserId: true }
      }),
      prisma.block.findMany({
        where: { blockerId: currentUser.id },
        select: { blockedId: true }
      }),
      prisma.block.findMany({
        where: { blockedId: currentUser.id },
        select: { blockerId: true }
      })
    ]);

    const excludeIds = [
      currentUser.id,
      ...likes.map(l => l.toUserId),
      ...passes.map(p => p.toUserId),
      ...blocks.map(b => b.blockedId),
      ...blockedBy.map(b => b.blockerId)
    ];

    // Get potential matches
    let users = await prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
        lat: { not: null },
        lng: { not: null }
      }
    });

    // Filter by distance
    users = users.filter(user => {
      if (!user.lat || !user.lng) return false;
      const distance = calculateDistance(lat, lng, user.lat, user.lng);
      return distance <= radiusKm;
    });

    // Filter by same gym if requested
    if (sameGymOnly && currentUser.gymName) {
      users = users.filter(user => 
        user.gymName?.toLowerCase() === currentUser.gymName?.toLowerCase()
      );
    }

    // Filter by goals if provided
    if (goals && goals.length > 0) {
      users = users.filter(user => {
        const userGoals = JSON.parse(user.goals || '[]') as string[];
        return goals.some(g => userGoals.includes(g));
      });
    }

    // Filter by level if provided
    if (level) {
      users = users.filter(user => user.level === level);
    }

    // Convert to profiles and sort by compatibility
    const profiles = users
      .map(user => toUserProfile(user, currentUser))
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    res.json({
      success: true,
      data: {
        items: profiles,
        total: profiles.length,
        likesRemaining: currentUser.likesRemaining
      }
    });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// GET /users/:id - Get user profile
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Gebruiker niet gevonden' });
    }

    res.json({
      success: true,
      data: toUserProfile(user, currentUser!)
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// PATCH /users/me - Update current user profile
router.patch('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = updateProfileSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: result.error.errors[0]?.message || 'Validatie fout' 
      });
    }

    const data = result.data;
    
    // Prepare update data
    const updateData: Record<string, unknown> = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.ageRange !== undefined) updateData.ageRange = data.ageRange;
    if (data.gymName !== undefined) updateData.gymName = data.gymName;
    if (data.gymAddress !== undefined) updateData.gymAddress = data.gymAddress;
    if (data.lat !== undefined) updateData.lat = data.lat;
    if (data.lng !== undefined) updateData.lng = data.lng;
    if (data.preferredRadius !== undefined) updateData.preferredRadius = data.preferredRadius;
    if (data.goals !== undefined) updateData.goals = JSON.stringify(data.goals);
    if (data.level !== undefined) updateData.level = data.level;
    if (data.trainingStyle !== undefined) updateData.trainingStyle = data.trainingStyle;
    if (data.availability !== undefined) updateData.availability = JSON.stringify(data.availability);
    if (data.interestTags !== undefined) updateData.interestTags = JSON.stringify(data.interestTags);

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData
    });

    // Recalculate verification score
    const verificationScore = calculateVerificationScore(user);
    
    if (verificationScore !== user.verificationScore) {
      await prisma.user.update({
        where: { id: user.id },
        data: { verificationScore }
      });
      user.verificationScore = verificationScore;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        ageRange: user.ageRange,
        gymName: user.gymName,
        gymAddress: user.gymAddress,
        lat: user.lat,
        lng: user.lng,
        preferredRadius: user.preferredRadius,
        goals: JSON.parse(user.goals),
        level: user.level,
        trainingStyle: user.trainingStyle,
        availability: JSON.parse(user.availability),
        interestTags: JSON.parse(user.interestTags),
        verificationScore: user.verificationScore,
        isPremium: user.isPremium,
        likesRemaining: user.likesRemaining,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// POST /users/me/avatar - Upload avatar (base64)
router.post('/me/avatar', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { imageBase64 } = req.body;
    
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'Image data vereist' });
    }

    // Validate it's a proper base64 image
    if (!imageBase64.startsWith('data:image/')) {
      return res.status(400).json({ success: false, error: 'Ongeldige image format' });
    }

    // Limit size (max 2MB base64)
    if (imageBase64.length > 2 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'Afbeelding te groot (max 2MB)' });
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatarUrl: imageBase64 }
    });

    res.json({
      success: true,
      data: { avatarUrl: user.avatarUrl }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// POST /users/:id/block - Block a user
router.post('/:id/block', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const blockedUserId = req.params.id;
    
    if (blockedUserId === req.user!.id) {
      return res.status(400).json({ success: false, error: 'Je kunt jezelf niet blokkeren' });
    }

    // Check if already blocked
    const existing = await prisma.block.findFirst({
      where: {
        blockerId: req.user!.id,
        blockedId: blockedUserId
      }
    });

    if (existing) {
      return res.json({ success: true, data: { blocked: true, message: 'Al geblokkeerd' } });
    }

    await prisma.block.create({
      data: {
        blockerId: req.user!.id,
        blockedId: blockedUserId
      }
    });

    // Also remove any existing matches
    await prisma.match.deleteMany({
      where: {
        OR: [
          { userAId: req.user!.id, userBId: blockedUserId },
          { userAId: blockedUserId, userBId: req.user!.id }
        ]
      }
    });

    res.json({
      success: true,
      data: { blocked: true, message: 'Gebruiker geblokkeerd' }
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// POST /users/:id/report - Report a user
router.post('/:id/report', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const reportedUserId = req.params.id;
    const { reason, details } = req.body;
    
    if (!reason) {
      return res.status(400).json({ success: false, error: 'Reden vereist' });
    }

    await prisma.report.create({
      data: {
        reporterId: req.user!.id,
        reportedId: reportedUserId,
        reason,
        details: details || null
      }
    });

    res.json({
      success: true,
      data: { reported: true, message: 'Melding verzonden' }
    });
  } catch (error) {
    console.error('Report user error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

export default router;



