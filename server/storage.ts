import { 
  users, 
  workoutInvitations, 
  chats, 
  workoutSessions,
  type User, 
  type InsertUser,
  type WorkoutInvitation,
  type InsertWorkoutInvitation,
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

  // Workout invitation operations
  createWorkoutInvitation(invitation: InsertWorkoutInvitation): Promise<WorkoutInvitation>;
  getInvitationsForUser(userId: number): Promise<WorkoutInvitation[]>;
  getInvitationsSentByUser(userId: number): Promise<WorkoutInvitation[]>;
  updateInvitationStatus(invitationId: number, status: string): Promise<WorkoutInvitation | undefined>;
  getInvitation(id: number): Promise<WorkoutInvitation | undefined>;

  // Chat operations
  createChat(chat: InsertChat): Promise<Chat>;
  getChatsForInvitation(invitationId: number): Promise<Chat[]>;

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

  async createWorkoutInvitation(insertInvitation: InsertWorkoutInvitation): Promise<WorkoutInvitation> {
    const [invitation] = await db
      .insert(workoutInvitations)
      .values(insertInvitation)
      .returning();
    return invitation;
  }

  async getInvitationsForUser(userId: number): Promise<WorkoutInvitation[]> {
    return await db
      .select()
      .from(workoutInvitations)
      .where(eq(workoutInvitations.toUserId, userId));
  }

  async getInvitationsSentByUser(userId: number): Promise<WorkoutInvitation[]> {
    return await db
      .select()
      .from(workoutInvitations)
      .where(eq(workoutInvitations.fromUserId, userId));
  }

  async updateInvitationStatus(invitationId: number, status: string): Promise<WorkoutInvitation | undefined> {
    const [invitation] = await db
      .update(workoutInvitations)
      .set({ status })
      .where(eq(workoutInvitations.id, invitationId))
      .returning();
    return invitation || undefined;
  }

  async getInvitation(id: number): Promise<WorkoutInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(workoutInvitations)
      .where(eq(workoutInvitations.id, id));
    return invitation || undefined;
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const [chat] = await db
      .insert(chats)
      .values(insertChat)
      .returning();
    return chat;
  }

  async getChatsForInvitation(invitationId: number): Promise<Chat[]> {
    return await db
      .select()
      .from(chats)
      .where(eq(chats.invitationId, invitationId))
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
    const sentInvitations = await this.getInvitationsSentByUser(userId);
    const receivedInvitations = await this.getInvitationsForUser(userId);
    const allInvitations = [...sentInvitations, ...receivedInvitations];
    const invitationIds = allInvitations.map(invitation => invitation.id);
    
    if (invitationIds.length === 0) return [];
    
    return await db
      .select()
      .from(workoutSessions)
      .where(inArray(workoutSessions.invitationId, invitationIds));
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
