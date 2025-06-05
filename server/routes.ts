import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertWorkoutInvitationSchema, 
  insertChatSchema, 
  insertWorkoutSessionSchema,
  registerSchema,
  loginSchema,
  profileSetupSchema
} from "@shared/schema";
import { z } from "zod";

// Session middleware setup
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    sessionId?: string;
  }
}

// Authentication middleware
const requireAuth = async (req: any, res: any, next: any) => {
  if (!req.session.userId || !req.session.sessionId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Verify session exists in database
  const session = await storage.getSession(req.session.sessionId);
  if (!session || session.expiresAt < new Date()) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Session expired" });
  }

  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      // Create user
      const user = await storage.createUser({
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        isProfileComplete: false
      });

      // Create session
      const sessionId = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await storage.createSession({
        id: sessionId,
        userId: user.id,
        expiresAt
      });

      // Set session
      req.session.userId = user.id;
      req.session.sessionId = sessionId;

      res.status(201).json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name,
          isProfileComplete: user.isProfileComplete 
        } 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const loginData = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(loginData.email);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(loginData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Delete existing sessions for this user
      await storage.deleteUserSessions(user.id);

      // Create new session
      const sessionId = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await storage.createSession({
        id: sessionId,
        userId: user.id,
        expiresAt
      });

      // Set session
      req.session.userId = user.id;
      req.session.sessionId = sessionId;

      res.json({ 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name,
          isProfileComplete: user.isProfileComplete 
        } 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req: any, res) => {
    try {
      if (req.session.sessionId) {
        await storage.deleteSession(req.session.sessionId);
      }
      req.session.destroy(() => {
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ 
        id: user.id, 
        email: user.email, 
        name: user.name,
        isProfileComplete: user.isProfileComplete 
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.post("/api/auth/complete-profile", requireAuth, async (req: any, res) => {
    try {
      const profileData = profileSetupSchema.parse(req.body);
      
      const updatedUser = await storage.updateUser(req.session.userId, {
        ...profileData,
        isProfileComplete: true
      });

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ 
        user: { 
          id: updatedUser.id, 
          email: updatedUser.email, 
          name: updatedUser.name,
          isProfileComplete: updatedUser.isProfileComplete 
        } 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid profile data", details: error.errors });
      }
      console.error("Profile completion error:", error);
      res.status(500).json({ error: "Failed to complete profile" });
    }
  });

  // User routes (protected)
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Search workout partners based on time, location and preferences
  app.get("/api/users/search-workout-partners", async (req, res) => {
    try {
      const { date, time, location, workoutType, experienceLevel, maxDistance } = req.query;
      
      const allUsers = await storage.getAllUsers();
      
      const filteredUsers = allUsers.filter(user => {
        if (!user.location || !user.experienceLevel) return false;
        
        if (location && user.location !== location) return false;
        if (experienceLevel && user.experienceLevel !== experienceLevel) return false;
        
        if (workoutType && user.preferredWorkouts) {
          const userWorkouts = Array.isArray(user.preferredWorkouts) 
            ? user.preferredWorkouts 
            : JSON.parse(user.preferredWorkouts as string || '[]');
          if (!userWorkouts.includes(workoutType)) return false;
        }
        
        return true;
      });
      
      res.json(filteredUsers);
    } catch (error) {
      console.error("Error searching workout partners:", error);
      res.status(500).json({ error: "Failed to search workout partners" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid user data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid user data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Get available workout partners for a user
  app.get("/api/users/:id/potential-matches", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get users in the same location
      const nearbyUsers = await storage.getUsersNearLocation(user.location, userId);
      res.json(nearbyUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch available users" });
    }
  });

  // Workout invitation routes
  app.post("/api/invitations", async (req, res) => {
    try {
      const invitationData = insertWorkoutInvitationSchema.parse(req.body);
      const invitation = await storage.createWorkoutInvitation(invitationData);
      res.status(201).json(invitation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid invitation data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  app.get("/api/users/:id/invitations", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const receivedInvitations = await storage.getInvitationsForUser(userId);
      const sentInvitations = await storage.getInvitationsSentByUser(userId);
      
      // Get user details for each invitation
      const enrichedReceived = await Promise.all(
        receivedInvitations.map(async (invitation) => {
          const fromUser = await storage.getUser(invitation.fromUserId);
          return { ...invitation, fromUser };
        })
      );

      const enrichedSent = await Promise.all(
        sentInvitations.map(async (invitation) => {
          const toUser = await storage.getUser(invitation.toUserId);
          return { ...invitation, toUser };
        })
      );

      res.json({ received: enrichedReceived, sent: enrichedSent });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invitations" });
    }
  });

  app.put("/api/invitations/:id/status", async (req, res) => {
    try {
      const invitationId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!["accepted", "declined"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const invitation = await storage.updateInvitationStatus(invitationId, status);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      // Broadcast real-time notification for invitation status change
      const notification = {
        type: 'invitation_status_updated',
        invitationId: invitationId,
        status: status,
        invitation: invitation
      };

      // Notify both sender and receiver
      broadcastToUser(invitation.fromUserId, notification);
      broadcastToUser(invitation.toUserId, notification);
      
      res.json(invitation);
    } catch (error) {
      res.status(500).json({ error: "Failed to update invitation status" });
    }
  });

  // Chat routes
  app.post("/api/chats", async (req, res) => {
    try {
      const chatData = insertChatSchema.parse(req.body);
      const chat = await storage.createChat(chatData);
      res.status(201).json(chat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid chat data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create chat message" });
    }
  });

  app.post("/api/invitations/:id/chats", async (req, res) => {
    try {
      const invitationId = parseInt(req.params.id);
      const chatData = insertChatSchema.parse({
        ...req.body,
        invitationId
      });
      const chat = await storage.createChat(chatData);

      // Broadcast the new message to all clients in the invitation room via WebSocket
      const invitationRoomKey = invitationId.toString();
      if (invitationRooms.has(invitationRoomKey)) {
        const clients = invitationRooms.get(invitationRoomKey)!;
        const broadcastMessage = {
          type: 'new_message',
          invitationId: invitationId,
          chat: chat
        };

        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(broadcastMessage));
          }
        });
      }

      res.status(201).json(chat);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid chat data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create chat message" });
    }
  });

  app.get("/api/invitations/:id/chats", async (req, res) => {
    try {
      const invitationId = parseInt(req.params.id);
      const chats = await storage.getChatsForInvitation(invitationId);
      res.json(chats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chats" });
    }
  });

  app.get("/api/invitations/:id", async (req, res) => {
    try {
      const invitationId = parseInt(req.params.id);
      const invitation = await storage.getInvitation(invitationId);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }

      const fromUser = await storage.getUser(invitation.fromUserId);
      const toUser = await storage.getUser(invitation.toUserId);
      
      res.json({ ...invitation, fromUser, toUser });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch invitation" });
    }
  });

  app.get("/api/invitations/:invitationId/chats", async (req, res) => {
    try {
      const invitationId = parseInt(req.params.invitationId);
      const chats = await storage.getChatsForInvitation(invitationId);
      res.json(chats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  // Workout session routes
  app.post("/api/workout-sessions", async (req, res) => {
    try {
      // Manual validation to handle date conversion
      const { invitationId, scheduledTime, location, workoutType, status } = req.body;
      
      const sessionData = {
        invitationId: parseInt(invitationId) || 0,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        location: location || "Westside Fitness",
        workoutType: workoutType || "Strength", 
        status: status || "scheduled"
      };
      
      const session = await storage.createWorkoutSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      console.error("Create workout session error:", error);
      res.status(500).json({ error: "Failed to create workout session" });
    }
  });

  app.get("/api/users/:id/workout-sessions", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const sessions = await storage.getWorkoutSessionsForUser(userId);
      
      // Enrich sessions with invitation details
      const enrichedSessions = await Promise.all(
        sessions.map(async (session) => {
          const invitation = await storage.getInvitation(session.invitationId);
          if (invitation) {
            const fromUser = await storage.getUser(invitation.fromUserId);
            const toUser = await storage.getUser(invitation.toUserId);
            return {
              ...session,
              invitation: {
                ...invitation,
                fromUser,
                toUser
              }
            };
          }
          return session;
        })
      );

      res.json(enrichedSessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workout sessions" });
    }
  });

  // WebSocket server setup for real-time chat
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store active connections by user ID and invitation ID
  const userConnections = new Map<number, Set<WebSocket>>();
  const invitationRooms = new Map<string, Set<WebSocket>>();

  // Helper function to broadcast to user
  const broadcastToUser = (userId: number, message: any) => {
    const connections = userConnections.get(userId);
    if (connections) {
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  };

  wss.on('connection', (ws: WebSocket) => {
    let currentUserId: number | null = null;
    let currentInvitationId: string | null = null;

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case 'authenticate':
            if (data.userId) {
              currentUserId = data.userId;
              if (!userConnections.has(currentUserId)) {
                userConnections.set(currentUserId, new Set());
              }
              userConnections.get(currentUserId)!.add(ws);
            }
            break;

          case 'join_invitation':
            if (data.invitationId) {
              currentInvitationId = data.invitationId;
              if (!invitationRooms.has(currentInvitationId)) {
                invitationRooms.set(currentInvitationId, new Set());
              }
              invitationRooms.get(currentInvitationId)!.add(ws);
            }
            break;

          case 'send_message':
            // WebSocket messages are handled by API endpoint to avoid duplication
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Remove from user connections
      if (currentUserId && userConnections.has(currentUserId)) {
        userConnections.get(currentUserId)!.delete(ws);
        if (userConnections.get(currentUserId)!.size === 0) {
          userConnections.delete(currentUserId);
        }
      }
      
      // Remove from invitation room
      if (currentInvitationId && invitationRooms.has(currentInvitationId)) {
        invitationRooms.get(currentInvitationId)!.delete(ws);
        if (invitationRooms.get(currentInvitationId)!.size === 0) {
          invitationRooms.delete(currentInvitationId);
        }
      }
    });
  });

  return httpServer;
}
