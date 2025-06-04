import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertWorkoutInvitationSchema, insertChatSchema } from "@shared/schema";
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

  app.get("/api/matches/:matchId/chats", async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      const chats = await storage.getChatsForMatch(matchId);
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
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workout sessions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
