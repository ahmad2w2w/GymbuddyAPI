import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../lib/auth.js';
import { toUserProfile } from '../lib/utils.js';
import { sendPushNotification } from './notifications.js';
import { z } from 'zod';

// Inline validator
const sendMessageSchema = z.object({
  text: z.string().min(1, 'Bericht mag niet leeg zijn').max(1000)
});

const router = Router();

// GET /matches - Get all matches (alias for /swipe/matches)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
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

// GET /matches/:id/messages - Get messages for a match
router.get('/:id/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const matchId = req.params.id;
    const userId = req.user!.id;

    // Verify user is part of match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        userA: true,
        userB: true
      }
    });

    if (!match) {
      return res.status(404).json({ success: false, error: 'Match niet gevonden' });
    }

    if (match.userAId !== userId && match.userBId !== userId) {
      return res.status(403).json({ success: false, error: 'Niet geautoriseerd' });
    }

    const messages = await prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: 'asc' }
    });

    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    const otherUser = match.userAId === userId ? match.userB : match.userA;

    res.json({
      success: true,
      data: {
        match: {
          id: match.id,
          otherUser: toUserProfile(otherUser, currentUser!),
          createdAt: match.createdAt.toISOString()
        },
        messages: messages.map(msg => ({
          id: msg.id,
          matchId: msg.matchId,
          senderId: msg.senderId,
          text: msg.text,
          createdAt: msg.createdAt.toISOString()
        }))
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// POST /matches/:id/messages - Send a message
router.post('/:id/messages', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = sendMessageSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: result.error.errors[0]?.message || 'Validatie fout' 
      });
    }

    const { text } = result.data;
    const matchId = req.params.id;
    const senderId = req.user!.id;

    // Verify user is part of match
    const match = await prisma.match.findUnique({
      where: { id: matchId }
    });

    if (!match) {
      return res.status(404).json({ success: false, error: 'Match niet gevonden' });
    }

    if (match.userAId !== senderId && match.userBId !== senderId) {
      return res.status(403).json({ success: false, error: 'Niet geautoriseerd' });
    }

    const message = await prisma.message.create({
      data: {
        matchId,
        senderId,
        text
      }
    });

    // Send push notification to the other user
    const sender = await prisma.user.findUnique({ where: { id: senderId } });
    const receiverId = match.userAId === senderId ? match.userBId : match.userAId;
    
    sendPushNotification(
      receiverId,
      `Nieuw bericht van ${sender?.name || 'iemand'}`,
      text.length > 50 ? text.substring(0, 50) + '...' : text,
      { type: 'message', matchId }
    );

    res.status(201).json({
      success: true,
      data: {
        id: message.id,
        matchId: message.matchId,
        senderId: message.senderId,
        text: message.text,
        createdAt: message.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

export default router;



