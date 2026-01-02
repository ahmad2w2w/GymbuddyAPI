import { Router, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, AuthRequest } from '../lib/auth.js';
import { calculateDistance, toUserProfile } from '../lib/utils.js';
import { z } from 'zod';

// Inline validators
const createSessionSchema = z.object({
  title: z.string().min(3, 'Titel moet minimaal 3 tekens zijn').max(100),
  workoutType: z.string(),
  intensity: z.string(),
  gymName: z.string().min(2).max(100),
  gymAddress: z.string().max(200).optional().nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  startTime: z.string(),
  durationMinutes: z.number().min(15).max(240),
  slots: z.number().min(1).max(5),
  notes: z.string().max(500).optional().nullable()
});

const handleJoinRequestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['accept', 'decline'])
});

const router = Router();

// POST /sessions - Create a new session
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = createSessionSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: result.error.errors[0]?.message || 'Validatie fout' 
      });
    }

    const data = result.data;
    const ownerId = req.user!.id;

    const session = await prisma.session.create({
      data: {
        ownerId,
        title: data.title,
        workoutType: data.workoutType,
        intensity: data.intensity,
        gymName: data.gymName,
        gymAddress: data.gymAddress,
        lat: data.lat,
        lng: data.lng,
        startTime: new Date(data.startTime),
        durationMinutes: data.durationMinutes,
        slots: data.slots,
        slotsAvailable: data.slots,
        notes: data.notes
      },
      include: {
        owner: true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: session.id,
        ownerId: session.ownerId,
        owner: toUserProfile(session.owner),
        title: session.title,
        workoutType: session.workoutType,
        intensity: session.intensity,
        gymName: session.gymName,
        gymAddress: session.gymAddress,
        lat: session.lat,
        lng: session.lng,
        startTime: session.startTime.toISOString(),
        durationMinutes: session.durationMinutes,
        slots: session.slots,
        slotsAvailable: session.slotsAvailable,
        notes: session.notes,
        createdAt: session.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// GET /sessions/nearby - Get sessions near a location
router.get('/nearby', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    const lat = parseFloat(req.query.lat as string) || currentUser?.lat || 52.3676;
    const lng = parseFloat(req.query.lng as string) || currentUser?.lng || 4.9041;
    const radiusKm = parseFloat(req.query.radiusKm as string) || 10;
    const timeFrom = req.query.timeFrom ? new Date(req.query.timeFrom as string) : new Date();
    const timeTo = req.query.timeTo ? new Date(req.query.timeTo as string) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const workoutType = req.query.workoutType as string | undefined;

    let sessions = await prisma.session.findMany({
      where: {
        startTime: {
          gte: timeFrom,
          lte: timeTo
        },
        slotsAvailable: { gt: 0 },
        ...(workoutType && { workoutType })
      },
      include: {
        owner: true
      },
      orderBy: { startTime: 'asc' }
    });

    // Filter by distance and add distance field
    const sessionsWithDistance = sessions
      .map(session => {
        const distance = calculateDistance(lat, lng, session.lat, session.lng);
        return { ...session, distance };
      })
      .filter(session => session.distance <= radiusKm)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    const sessionData = sessionsWithDistance.map(session => ({
      id: session.id,
      ownerId: session.ownerId,
      owner: toUserProfile(session.owner, currentUser!),
      title: session.title,
      workoutType: session.workoutType,
      intensity: session.intensity,
      gymName: session.gymName,
      gymAddress: session.gymAddress,
      lat: session.lat,
      lng: session.lng,
      startTime: session.startTime.toISOString(),
      durationMinutes: session.durationMinutes,
      slots: session.slots,
      slotsAvailable: session.slotsAvailable,
      notes: session.notes,
      distance: Math.round(session.distance * 10) / 10,
      createdAt: session.createdAt.toISOString()
    }));

    res.json({
      success: true,
      data: sessionData
    });
  } catch (error) {
    console.error('Get nearby sessions error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// GET /sessions/mine - Get my sessions
router.get('/mine', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { ownerId: req.user!.id },
      include: {
        owner: true,
        joinRequests: {
          include: { requester: true }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    const sessionData = sessions.map(session => ({
      id: session.id,
      ownerId: session.ownerId,
      owner: toUserProfile(session.owner, currentUser!),
      title: session.title,
      workoutType: session.workoutType,
      intensity: session.intensity,
      gymName: session.gymName,
      gymAddress: session.gymAddress,
      lat: session.lat,
      lng: session.lng,
      startTime: session.startTime.toISOString(),
      durationMinutes: session.durationMinutes,
      slots: session.slots,
      slotsAvailable: session.slotsAvailable,
      notes: session.notes,
      createdAt: session.createdAt.toISOString(),
      joinRequests: session.joinRequests.map(jr => ({
        id: jr.id,
        sessionId: jr.sessionId,
        requesterId: jr.requesterId,
        requester: toUserProfile(jr.requester, currentUser!),
        status: jr.status,
        createdAt: jr.createdAt.toISOString()
      }))
    }));

    res.json({
      success: true,
      data: sessionData
    });
  } catch (error) {
    console.error('Get my sessions error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// GET /sessions/:id - Get session by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id }
    });

    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        owner: true,
        joinRequests: {
          include: { requester: true }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Sessie niet gevonden' });
    }

    // Only show join requests to owner
    const joinRequests = session.ownerId === req.user!.id 
      ? session.joinRequests.map(jr => ({
          id: jr.id,
          sessionId: jr.sessionId,
          requesterId: jr.requesterId,
          requester: toUserProfile(jr.requester, currentUser!),
          status: jr.status,
          createdAt: jr.createdAt.toISOString()
        }))
      : [];

    // Check if current user has requested
    const myRequest = session.joinRequests.find(jr => jr.requesterId === req.user!.id);

    res.json({
      success: true,
      data: {
        id: session.id,
        ownerId: session.ownerId,
        owner: toUserProfile(session.owner, currentUser!),
        title: session.title,
        workoutType: session.workoutType,
        intensity: session.intensity,
        gymName: session.gymName,
        gymAddress: session.gymAddress,
        lat: session.lat,
        lng: session.lng,
        startTime: session.startTime.toISOString(),
        durationMinutes: session.durationMinutes,
        slots: session.slots,
        slotsAvailable: session.slotsAvailable,
        notes: session.notes,
        createdAt: session.createdAt.toISOString(),
        joinRequests,
        myRequestStatus: myRequest?.status || null
      }
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// POST /sessions/:id/request - Request to join a session
router.post('/:id/request', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.params.id;
    const requesterId = req.user!.id;

    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Sessie niet gevonden' });
    }

    if (session.ownerId === requesterId) {
      return res.status(400).json({ success: false, error: 'Je kunt niet je eigen sessie joinen' });
    }

    if (session.slotsAvailable <= 0) {
      return res.status(400).json({ success: false, error: 'Geen plekken meer beschikbaar' });
    }

    // Check existing request
    const existingRequest = await prisma.joinRequest.findUnique({
      where: {
        sessionId_requesterId: { sessionId, requesterId }
      }
    });

    if (existingRequest) {
      return res.status(400).json({ success: false, error: 'Je hebt al een verzoek gestuurd' });
    }

    const joinRequest = await prisma.joinRequest.create({
      data: { sessionId, requesterId },
      include: { requester: true }
    });

    res.status(201).json({
      success: true,
      data: {
        id: joinRequest.id,
        sessionId: joinRequest.sessionId,
        requesterId: joinRequest.requesterId,
        status: joinRequest.status,
        createdAt: joinRequest.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Request join error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

// POST /sessions/:id/handle-request - Accept or decline a join request
router.post('/:id/handle-request', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = handleJoinRequestSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        success: false, 
        error: result.error.errors[0]?.message || 'Validatie fout' 
      });
    }

    const { requestId, action } = result.data;
    const sessionId = req.params.id;

    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({ success: false, error: 'Sessie niet gevonden' });
    }

    if (session.ownerId !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Niet geautoriseerd' });
    }

    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId }
    });

    if (!joinRequest || joinRequest.sessionId !== sessionId) {
      return res.status(404).json({ success: false, error: 'Verzoek niet gevonden' });
    }

    if (joinRequest.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Verzoek is al afgehandeld' });
    }

    if (action === 'accept') {
      if (session.slotsAvailable <= 0) {
        return res.status(400).json({ success: false, error: 'Geen plekken meer beschikbaar' });
      }

      await prisma.$transaction([
        prisma.joinRequest.update({
          where: { id: requestId },
          data: { status: 'accepted' }
        }),
        prisma.session.update({
          where: { id: sessionId },
          data: { slotsAvailable: session.slotsAvailable - 1 }
        })
      ]);
    } else {
      await prisma.joinRequest.update({
        where: { id: requestId },
        data: { status: 'declined' }
      });
    }

    res.json({
      success: true,
      data: {
        requestId,
        status: action === 'accept' ? 'accepted' : 'declined'
      }
    });
  } catch (error) {
    console.error('Handle request error:', error);
    res.status(500).json({ success: false, error: 'Er ging iets mis' });
  }
});

export default router;
