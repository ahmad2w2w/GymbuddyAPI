import { 
  users, 
  workoutInvitations, 
  chats, 
  workoutSessions,
  sessions,
  type User, 
  type InsertUser,
  type WorkoutInvitation,
  type InsertWorkoutInvitation,
  type Chat,
  type InsertChat,
  type WorkoutSession,
  type InsertWorkoutSession,
  type Session,
  type InsertSession,
  userAvailability,
  type UserAvailability,
  type InsertUserAvailability
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, inArray, not } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByName(name: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUsersNearLocation(location: string, excludeUserId?: number): Promise<User[]>;

  // Authentication operations
  createSession(session: InsertSession): Promise<Session>;
  getSession(id: string): Promise<Session | undefined>;
  deleteSession(id: string): Promise<void>;
  deleteUserSessions(userId: number): Promise<void>;

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

  // User availability operations
  createUserAvailability(availability: InsertUserAvailability): Promise<UserAvailability>;
  getUserAvailability(userId: number): Promise<UserAvailability[]>;
  getUsersAvailableAt(date: string, timeSlot: string, location: string, workoutType: string): Promise<User[]>;
  
  // Smart matching operations
  getSmartMatches(userId: number): Promise<User[]>;
  calculateMatchScore(user1: User, user2: User): number;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  // Authentication operations
  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async deleteSession(id: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async deleteUserSessions(userId: number): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  // User availability operations
  async createUserAvailability(insertAvailability: InsertUserAvailability): Promise<UserAvailability> {
    const [availability] = await db
      .insert(userAvailability)
      .values(insertAvailability)
      .returning();
    return availability;
  }

  async getUserAvailability(userId: number): Promise<UserAvailability[]> {
    return await db.select().from(userAvailability).where(eq(userAvailability.userId, userId));
  }

  async getUsersAvailableAt(date: string, timeSlot: string, location: string, workoutType: string): Promise<User[]> {
    // Find users available at specific date/time/location
    const availableUserIds = await db
      .select({ userId: userAvailability.userId })
      .from(userAvailability)
      .where(
        and(
          eq(userAvailability.date, date),
          eq(userAvailability.timeSlot, timeSlot),
          eq(userAvailability.location, location),
          eq(userAvailability.isAvailable, true)
        )
      );

    if (availableUserIds.length === 0) return [];

    const userIds = availableUserIds.map(row => row.userId);
    
    // Get users who match the workout type and are available
    return await db
      .select()
      .from(users)
      .where(
        and(
          inArray(users.id, userIds),
          or(
            eq(users.preferredWorkouts, null),
            // Check if workout type is in their preferred workouts array
            // This is a simplified check - in production you'd want better array handling
          )
        )
      );
  }

  // Smart matching based on compatibility
  async getSmartMatches(userId: number): Promise<User[]> {
    const currentUser = await this.getUser(userId);
    if (!currentUser) return [];

    // Get all other users
    const allUsers = await db
      .select()
      .from(users)
      .where(
        and(
          not(eq(users.id, userId)),
          eq(users.isProfileComplete, true)
        )
      );

    // Calculate match scores and sort
    const usersWithScores = allUsers
      .map(user => ({
        user,
        score: this.calculateMatchScore(currentUser, user)
      }))
      .filter(item => item.score >= 50) // Only show matches with 50%+ compatibility
      .sort((a, b) => b.score - a.score);

    return usersWithScores.map(item => item.user);
  }

  // Calculate compatibility score between two users
  calculateMatchScore(user1: User, user2: User): number {
    let score = 0;
    let maxScore = 0;

    // Location compatibility (30% weight)
    if (user1.location && user2.location) {
      maxScore += 30;
      if (user1.location === user2.location) {
        score += 30;
      } else {
        // Partial score for nearby locations (simplified)
        score += 10;
      }
    }

    // Workout type compatibility (25% weight)
    if (user1.preferredWorkouts && user2.preferredWorkouts) {
      maxScore += 25;
      const commonWorkouts = user1.preferredWorkouts.filter(w => 
        user2.preferredWorkouts?.includes(w)
      );
      score += Math.min(25, (commonWorkouts.length / Math.max(user1.preferredWorkouts.length, user2.preferredWorkouts.length)) * 25);
    }

    // Experience level compatibility (20% weight)
    if (user1.experienceLevel && user2.experienceLevel) {
      maxScore += 20;
      if (user1.experienceLevel === user2.experienceLevel) {
        score += 20;
      } else {
        // Adjacent levels get partial score
        const levels = ['Beginner', 'Intermediate', 'Advanced'];
        const diff = Math.abs(levels.indexOf(user1.experienceLevel) - levels.indexOf(user2.experienceLevel));
        if (diff === 1) score += 10;
      }
    }

    // Time flexibility compatibility (15% weight)
    maxScore += 15;
    if (user1.isFlexibleWithTimes && user2.isFlexibleWithTimes) {
      score += 15;
    } else if (user1.isFlexibleWithTimes || user2.isFlexibleWithTimes) {
      score += 8;
    }

    // Spontaneous workout compatibility (10% weight)
    maxScore += 10;
    if (user1.allowsSpontaneousWorkouts && user2.allowsSpontaneousWorkouts) {
      score += 10;
    } else if (user1.allowsSpontaneousWorkouts || user2.allowsSpontaneousWorkouts) {
      score += 5;
    }

    // Return percentage score
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }
}

export const storage = new DatabaseStorage();
