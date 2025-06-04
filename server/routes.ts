import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertWorkoutInvitationSchema, insertChatSchema, insertWorkoutSessionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
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
      const sessionData = req.body;
      const session = await storage.createWorkoutSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
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

  // Store active connections by invitation ID
  const invitationRooms = new Map<string, Set<WebSocket>>();

  wss.on('connection', (ws: WebSocket) => {
    let currentInvitationId: string | null = null;

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
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
            if (data.invitationId && invitationRooms.has(data.invitationId)) {
              const clients = invitationRooms.get(data.invitationId)!;
              clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'new_message',
                    invitationId: data.invitationId,
                    message: data.message
                  }));
                }
              });
            }
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
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
