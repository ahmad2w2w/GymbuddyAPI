import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertMatchSchema, insertChatSchema } from "@shared/schema";
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

  // Get potential matches for a user
  app.get("/api/users/:id/potential-matches", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get users in the same location
      const nearbyUsers = await storage.getUsersNearLocation(user.location, userId);
      
      // Filter out users already matched with
      const existingMatches = await storage.getMatchesForUser(userId);
      const matchedUserIds = existingMatches.map(match => 
        match.user1Id === userId ? match.user2Id : match.user1Id
      );

      const potentialMatches = nearbyUsers.filter(u => !matchedUserIds.includes(u.id));
      res.json(potentialMatches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch potential matches" });
    }
  });

  // Match routes
  app.post("/api/matches", async (req, res) => {
    try {
      const matchData = insertMatchSchema.parse(req.body);
      
      // Check if match already exists
      const existingMatch = await storage.getMatch(matchData.user1Id, matchData.user2Id);
      if (existingMatch) {
        // If the other user already liked this user, it's a mutual match
        if (existingMatch.status === "pending" && existingMatch.user1Id === matchData.user2Id) {
          const updatedMatch = await storage.updateMatchStatus(existingMatch.id, "accepted");
          return res.json({ ...updatedMatch, mutual: true });
        }
        return res.status(400).json({ error: "Match already exists" });
      }

      const match = await storage.createMatch(matchData);
      res.status(201).json({ ...match, mutual: false });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid match data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create match" });
    }
  });

  app.get("/api/users/:id/matches", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const matches = await storage.getMutualMatches(userId);
      
      // Get user details for each match
      const matchesWithUsers = await Promise.all(
        matches.map(async (match) => {
          const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
          const otherUser = await storage.getUser(otherUserId);
          return { ...match, otherUser };
        })
      );

      res.json(matchesWithUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matches" });
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
