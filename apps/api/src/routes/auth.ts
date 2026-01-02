import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { generateToken, hashPassword, comparePassword, authMiddleware, AuthRequest } from '../lib/auth.js';
import { calculateVerificationScore } from '../lib/utils.js';
import { z } from 'zod';

// Inline validators (instead of shared package)
const loginSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens zijn')
});

const registerSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens zijn'),
  name: z.string().min(2, 'Naam moet minimaal 2 tekens zijn').max(50)
});

const router = Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const result = registerSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: result.error.errors[0]?.message || 'Validatie fout' 
      });
    }

    const { email, password, name } = result.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'Dit e-mailadres is al in gebruik' 
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        verificationScore: 10 // Just name gives 10 points
      }
    });

    const token = generateToken({ userId: user.id, email: user.email });

    res.status(201).json({
      success: true,
      data: {
        user: {
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
        },
        tokens: {
          accessToken: token
        }
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis bij registratie' });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const result = loginSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: result.error.errors[0]?.message || 'Validatie fout' 
      });
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Ongeldige inloggegevens' 
      });
    }

    const isValid = await comparePassword(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Ongeldige inloggegevens' 
      });
    }

    // Reset daily likes if needed
    const now = new Date();
    const lastReset = new Date(user.lastLikeReset);
    if (now.getDate() !== lastReset.getDate() && !user.isPremium) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          likesRemaining: 10,
          lastLikeReset: now
        }
      });
      user.likesRemaining = 10;
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      success: true,
      data: {
        user: {
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
        },
        tokens: {
          accessToken: token
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis bij inloggen' });
  }
});

// GET /auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Gebruiker niet gevonden' });
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
    console.error('Get me error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// POST /auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'E-mailadres vereist' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ 
        success: true, 
        data: { message: 'Als dit e-mailadres bestaat, ontvang je een reset link' } 
      });
    }

    // Generate reset token (6 digit code for simplicity)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExp = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExp }
    });

    // In production, send email here
    // For now, log the token (in production use SendGrid, Resend, etc.)
    console.log(`[PASSWORD RESET] Email: ${email}, Code: ${resetToken}`);

    res.json({ 
      success: true, 
      data: { 
        message: 'Als dit e-mailadres bestaat, ontvang je een reset link',
        // Only include in development!
        devCode: process.env.NODE_ENV === 'development' ? resetToken : undefined
      } 
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// POST /auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    if (!email || !code || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'E-mail, code en nieuw wachtwoord vereist' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Wachtwoord moet minimaal 6 tekens zijn' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.resetToken || !user.resetTokenExp) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ongeldige of verlopen reset code' 
      });
    }

    if (user.resetToken !== code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ongeldige code' 
      });
    }

    if (new Date() > user.resetTokenExp) {
      return res.status(400).json({ 
        success: false, 
        error: 'Reset code is verlopen' 
      });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExp: null
      }
    });

    res.json({ 
      success: true, 
      data: { message: 'Wachtwoord succesvol gewijzigd' } 
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// POST /auth/change-password - Change password (logged in)
router.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Huidig en nieuw wachtwoord vereist' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nieuw wachtwoord moet minimaal 6 tekens zijn' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Gebruiker niet gevonden' });
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Huidig wachtwoord is onjuist' 
      });
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    res.json({ 
      success: true, 
      data: { message: 'Wachtwoord succesvol gewijzigd' } 
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// DELETE /auth/account - Delete account
router.delete('/account', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ success: false, error: 'Wachtwoord vereist' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'Gebruiker niet gevonden' });
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Wachtwoord onjuist' });
    }

    // Delete user (cascades to related records)
    await prisma.user.delete({
      where: { id: user.id }
    });

    res.json({ 
      success: true, 
      data: { message: 'Account succesvol verwijderd' } 
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

export default router;



