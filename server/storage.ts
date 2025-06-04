import { 
  users, 
  matches, 
  chats, 
  workoutSessions,
  type User, 
  type InsertUser,
  type Match,
  type InsertMatch,
  type Chat,
  type InsertChat,
  type WorkoutSession,
  type InsertWorkoutSession
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, inArray, not } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByName(name: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersNearLocation(location: string, excludeUserId?: number): Promise<User[]>;

  // Match operations
  createMatch(match: InsertMatch): Promise<Match>;
  getMatchesForUser(userId: number): Promise<Match[]>;
  getMatch(user1Id: number, user2Id: number): Promise<Match | undefined>;
  updateMatchStatus(matchId: number, status: string): Promise<Match | undefined>;
  getMutualMatches(userId: number): Promise<Match[]>;

  // Chat operations
  createChat(chat: InsertChat): Promise<Chat>;
  getChatsForMatch(matchId: number): Promise<Chat[]>;

  // Workout session operations
  createWorkoutSession(session: InsertWorkoutSession): Promise<WorkoutSession>;
  getWorkoutSessionsForUser(userId: number): Promise<WorkoutSession[]>;
  updateWorkoutSessionStatus(sessionId: number, status: string): Promise<WorkoutSession | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByName(name: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.name, name));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUsersNearLocation(location: string, excludeUserId?: number): Promise<User[]> {
    if (excludeUserId) {
      return await db
        .select()
        .from(users)
        .where(and(eq(users.location, location), not(eq(users.id, excludeUserId))));
    }
    return await db.select().from(users).where(eq(users.location, location));
  }

  async createMatch(insertMatch: InsertMatch): Promise<Match> {
    const [match] = await db
      .insert(matches)
      .values(insertMatch)
      .returning();
    return match;
  }

  async getMatchesForUser(userId: number): Promise<Match[]> {
    return await db
      .select()
      .from(matches)
      .where(eq(matches.user1Id, userId) || eq(matches.user2Id, userId));
  }

  async getMatch(user1Id: number, user2Id: number): Promise<Match | undefined> {
    const [match] = await db
      .select()
      .from(matches)
      .where(
        (eq(matches.user1Id, user1Id) && eq(matches.user2Id, user2Id)) ||
        (eq(matches.user1Id, user2Id) && eq(matches.user2Id, user1Id))
      );
    return match || undefined;
  }

  async updateMatchStatus(matchId: number, status: string): Promise<Match | undefined> {
    const [match] = await db
      .update(matches)
      .set({ status })
      .where(eq(matches.id, matchId))
      .returning();
    return match || undefined;
  }

  async getMutualMatches(userId: number): Promise<Match[]> {
    return await db
      .select()
      .from(matches)
      .where(
        (eq(matches.user1Id, userId) || eq(matches.user2Id, userId)) &&
        eq(matches.status, "accepted")
      );
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const [chat] = await db
      .insert(chats)
      .values(insertChat)
      .returning();
    return chat;
  }

  async getChatsForMatch(matchId: number): Promise<Chat[]> {
    return await db
      .select()
      .from(chats)
      .where(eq(chats.matchId, matchId))
      .orderBy(chats.sentAt);
  }

  async createWorkoutSession(insertSession: InsertWorkoutSession): Promise<WorkoutSession> {
    const [session] = await db
      .insert(workoutSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getWorkoutSessionsForUser(userId: number): Promise<WorkoutSession[]> {
    const userMatches = await this.getMatchesForUser(userId);
    const matchIds = userMatches.map(match => match.id);
    
    if (matchIds.length === 0) return [];
    
    return await db
      .select()
      .from(workoutSessions)
      .where(inArray(workoutSessions.matchId, matchIds));
  }

  async updateWorkoutSessionStatus(sessionId: number, status: string): Promise<WorkoutSession | undefined> {
    const [session] = await db
      .update(workoutSessions)
      .set({ status })
      .where(eq(workoutSessions.id, sessionId))
      .returning();
    return session || undefined;
  }
}

export const storage = new DatabaseStorage();
