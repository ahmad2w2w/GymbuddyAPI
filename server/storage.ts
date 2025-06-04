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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private matches: Map<number, Match>;
  private chats: Map<number, Chat>;
  private workoutSessions: Map<number, WorkoutSession>;
  private currentUserId: number;
  private currentMatchId: number;
  private currentChatId: number;
  private currentSessionId: number;

  constructor() {
    this.users = new Map();
    this.matches = new Map();
    this.chats = new Map();
    this.workoutSessions = new Map();
    this.currentUserId = 1;
    this.currentMatchId = 1;
    this.currentChatId = 1;
    this.currentSessionId = 1;

    // Initialize with some sample users for testing
    this.initializeData();
  }

  private async initializeData() {
    const sampleUsers: InsertUser[] = [
      {
        name: "Sarah",
        age: 28,
        bio: "Love morning workouts! Looking for a gym buddy to push each other. Focusing on strength training and HIIT this month 💪",
        profileImage: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=800",
        location: "Downtown Gym",
        experienceLevel: "Intermediate",
        preferredWorkouts: ["Strength", "Cardio"],
        availableNow: true,
        preferredTimeSlots: ["Morning", "Afternoon"],
        workoutDuration: "60-90 mins",
        whatsappNumber: "+1234567890",
        latitude: "40.7128",
        longitude: "-74.0060"
      },
      {
        name: "Mike",
        age: 32,
        bio: "Powerlifter looking for serious training partners. Been lifting for 8 years, always ready to spot and motivate!",
        profileImage: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        location: "Downtown Gym",
        experienceLevel: "Advanced",
        preferredWorkouts: ["Strength", "Powerlifting"],
        availableNow: false,
        preferredTimeSlots: ["Evening"],
        workoutDuration: "90-120 mins",
        whatsappNumber: "+1234567891",
        latitude: "40.7589",
        longitude: "-73.9851"
      },
      {
        name: "Emma",
        age: 25,
        bio: "Yoga instructor and fitness enthusiast. Love mixing cardio with mindfulness. Always up for outdoor workouts too!",
        profileImage: "https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=800",
        location: "Westside Fitness",
        experienceLevel: "Intermediate",
        preferredWorkouts: ["Yoga", "Cardio", "Outdoor"],
        availableNow: true,
        preferredTimeSlots: ["Morning", "Evening"],
        workoutDuration: "45-60 mins",
        whatsappNumber: "+1234567892",
        latitude: "40.7831",
        longitude: "-73.9712"
      }
    ];

    for (const user of sampleUsers) {
      await this.createUser(user);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByName(name: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.name === name);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      rating: "5.0",
      workoutCount: 0
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUsersNearLocation(location: string, excludeUserId?: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => 
      user.location === location && user.id !== excludeUserId
    );
  }

  async createMatch(insertMatch: InsertMatch): Promise<Match> {
    const id = this.currentMatchId++;
    const match: Match = {
      ...insertMatch,
      id,
      createdAt: new Date()
    };
    this.matches.set(id, match);
    return match;
  }

  async getMatchesForUser(userId: number): Promise<Match[]> {
    return Array.from(this.matches.values()).filter(match => 
      match.user1Id === userId || match.user2Id === userId
    );
  }

  async getMatch(user1Id: number, user2Id: number): Promise<Match | undefined> {
    return Array.from(this.matches.values()).find(match => 
      (match.user1Id === user1Id && match.user2Id === user2Id) ||
      (match.user1Id === user2Id && match.user2Id === user1Id)
    );
  }

  async updateMatchStatus(matchId: number, status: string): Promise<Match | undefined> {
    const match = this.matches.get(matchId);
    if (!match) return undefined;
    
    const updatedMatch = { ...match, status };
    this.matches.set(matchId, updatedMatch);
    return updatedMatch;
  }

  async getMutualMatches(userId: number): Promise<Match[]> {
    return Array.from(this.matches.values()).filter(match => 
      (match.user1Id === userId || match.user2Id === userId) && 
      match.status === "accepted"
    );
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const id = this.currentChatId++;
    const chat: Chat = {
      ...insertChat,
      id,
      sentAt: new Date()
    };
    this.chats.set(id, chat);
    return chat;
  }

  async getChatsForMatch(matchId: number): Promise<Chat[]> {
    return Array.from(this.chats.values())
      .filter(chat => chat.matchId === matchId)
      .sort((a, b) => a.sentAt!.getTime() - b.sentAt!.getTime());
  }

  async createWorkoutSession(insertSession: InsertWorkoutSession): Promise<WorkoutSession> {
    const id = this.currentSessionId++;
    const session: WorkoutSession = {
      ...insertSession,
      id,
      createdAt: new Date()
    };
    this.workoutSessions.set(id, session);
    return session;
  }

  async getWorkoutSessionsForUser(userId: number): Promise<WorkoutSession[]> {
    const userMatches = await this.getMatchesForUser(userId);
    const matchIds = userMatches.map(match => match.id);
    
    return Array.from(this.workoutSessions.values()).filter(session => 
      matchIds.includes(session.matchId)
    );
  }

  async updateWorkoutSessionStatus(sessionId: number, status: string): Promise<WorkoutSession | undefined> {
    const session = this.workoutSessions.get(sessionId);
    if (!session) return undefined;
    
    const updatedSession = { ...session, status };
    this.workoutSessions.set(sessionId, updatedSession);
    return updatedSession;
  }
}

export const storage = new MemStorage();
