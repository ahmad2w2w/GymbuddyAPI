import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../lib/auth.js';
import { toUserProfile } from '../lib/utils.js';
import { sendPushNotification } from './notifications.js';
import { z } from 'zod';

// Inline validator
const swipeSchema = z.object({
  toUserId: z.string().uuid()
});

const router = Router();

// POST /swipe/like
router.post('/like', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = swipeSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: result.error.errors[0]?.message || 'Validatie fout' 
      });
    }

    const { toUserId } = result.data;
    const fromUserId = req.user!.id;

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: fromUserId }
    });

    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'Gebruiker niet gevonden' });
    }

    // Check likes remaining (unless premium)
    if (!currentUser.isPremium && currentUser.likesRemaining <= 0) {
      return res.status(403).json({ 
        success: false, 
        error: 'Je hebt geen likes meer over vandaag. Upgrade naar Premium voor onbeperkte likes!' 
      });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: toUserId }
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Gebruiker niet gevonden' });
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        fromUserId_toUserId: { fromUserId, toUserId }
      }
    });

    if (existingLike) {
      return res.status(400).json({ success: false, error: 'Je hebt deze persoon al geliked' });
    }

    // Create like
    await prisma.like.create({
      data: { fromUserId, toUserId }
    });

    // Decrement likes if not premium
    if (!currentUser.isPremium) {
      await prisma.user.update({
        where: { id: fromUserId },
        data: { likesRemaining: currentUser.likesRemaining - 1 }
      });
    }

    // Check if mutual like (match!)
    const mutualLike = await prisma.like.findUnique({
      where: {
        fromUserId_toUserId: { fromUserId: toUserId, toUserId: fromUserId }
      }
    });

    let match = null;
    if (mutualLike) {
      // Create match (order by ID to ensure uniqueness)
      const [userAId, userBId] = [fromUserId, toUserId].sort();
      
      const existingMatch = await prisma.match.findUnique({
        where: {
          userAId_userBId: { userAId, userBId }
        }
      });

      if (!existingMatch) {
        match = await prisma.match.create({
          data: { userAId, userBId }
        });

        // Send push notification to the other user
        sendPushNotification(
          toUserId,
          'Nieuwe match! 🎉',
          `${currentUser.name} en jij zijn een match! Start een gesprek.`,
          { type: 'match', matchId: match.id }
        );
      }
    }

    res.json({
      success: true,
      data: {
        liked: true,
        isMatch: !!match,
        match: match ? {
          id: match.id,
          otherUser: toUserProfile(targetUser, currentUser)
        } : null,
        likesRemaining: currentUser.isPremium ? 999 : currentUser.likesRemaining - 1
      }
    });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// POST /swipe/pass
router.post('/pass', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = swipeSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: result.error.errors[0]?.message || 'Validatie fout' 
      });
    }

    const { toUserId } = result.data;
    const fromUserId = req.user!.id;

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: toUserId }
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Gebruiker niet gevonden' });
    }

    // Create pass (upsert to handle duplicates)
    await prisma.pass.upsert({
      where: {
        fromUserId_toUserId: { fromUserId, toUserId }
      },
      create: { fromUserId, toUserId },
      update: {}
    });

    res.json({
      success: true,
      data: { passed: true }
    });
  } catch (error) {
    console.error('Pass error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// GET /swipe/matches - Get all matches
router.get('/matches', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { userAId: userId },
          { userBId: userId }
        ]
      },
      include: {
        userA: true,
        userB: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const matchData = matches.map(match => {
      const otherUser = match.userAId === userId ? match.userB : match.userA;
      const lastMessage = match.messages[0] || null;

      return {
        id: match.id,
        otherUser: toUserProfile(otherUser, currentUser!),
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          senderId: lastMessage.senderId,
          text: lastMessage.text,
          createdAt: lastMessage.createdAt.toISOString()
        } : null,
        createdAt: match.createdAt.toISOString()
      };
    });

    res.json({
      success: true,
      data: matchData
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

export default router;
