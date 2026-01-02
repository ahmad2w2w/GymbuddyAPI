import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../lib/auth.js';

const router = Router();

// POST /notifications/token - Register push token
router.post('/token', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { token, platform } = req.body;
    
    if (!token || !platform) {
      return res.status(400).json({ success: false, error: 'Token en platform vereist' });
    }

    if (!['ios', 'android'].includes(platform)) {
      return res.status(400).json({ success: false, error: 'Platform moet ios of android zijn' });
    }

    // Upsert the token
    await prisma.pushToken.upsert({
      where: { token },
      update: { userId: req.user!.id, platform },
      create: { userId: req.user!.id, token, platform }
    });

    res.json({
      success: true,
      data: { registered: true }
    });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// DELETE /notifications/token - Remove push token
router.delete('/token', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token vereist' });
    }

    await prisma.pushToken.deleteMany({
      where: { token, userId: req.user!.id }
    });

    res.json({
      success: true,
      data: { removed: true }
    });
  } catch (error) {
    console.error('Remove push token error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// Helper function to send push notifications (exported for use in other routes)
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const tokens = await prisma.pushToken.findMany({
      where: { userId }
    });

    if (tokens.length === 0) return;

    // Send to Expo Push API
    const messages = tokens.map(t => ({
      to: t.token,
      sound: 'default' as const,
      title,
      body,
      data
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages)
    });

    const result = await response.json();
    console.log('[PUSH] Sent notification to', userId, result);
  } catch (error) {
    console.error('[PUSH] Error sending notification:', error);
  }
}

export default router;
