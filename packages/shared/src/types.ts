import type {
  GOALS,
  LEVELS,
  TRAINING_STYLES,
  WORKOUT_TYPES,
  INTENSITIES,
  INTEREST_TAGS,
  WEEKDAYS,
  TIME_SLOTS,
  AGE_RANGES,
  JOIN_REQUEST_STATUS
} from './constants';

// Base types from constants
export type Goal = typeof GOALS[number];
export type Level = typeof LEVELS[number];
export type TrainingStyle = typeof TRAINING_STYLES[number];
export type WorkoutType = typeof WORKOUT_TYPES[number];
export type Intensity = typeof INTENSITIES[number];
export type InterestTag = typeof INTEREST_TAGS[number];
export type Weekday = typeof WEEKDAYS[number];
export type TimeSlot = typeof TIME_SLOTS[number];
export type AgeRange = typeof AGE_RANGES[number];
export type JoinRequestStatus = typeof JOIN_REQUEST_STATUS[number];

// Availability
export interface Availability {
  day: Weekday;
  timeSlots: TimeSlot[];
}

// User
export interface User {
  id: string;
  email: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  ageRange: AgeRange | null;
  gymName: string | null;
  gymAddress: string | null;
  lat: number | null;
  lng: number | null;
  preferredRadius: number; // in km
  goals: Goal[];
  level: Level | null;
  trainingStyle: TrainingStyle | null;
  availability: Availability[];
  interestTags: InterestTag[];
  verificationScore: number;
  isPremium: boolean;
  likesRemaining: number;
  createdAt: string;
  updatedAt: string;
}

// User for feed (public info only)
export interface UserProfile {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  ageRange: AgeRange | null;
  gymName: string | null;
  distance: number | null; // km
  goals: Goal[];
  level: Level | null;
  trainingStyle: TrainingStyle | null;
  availability: Availability[];
  interestTags: InterestTag[];
  verificationScore: number;
  compatibilityScore: number;
}

// Session
export interface Session {
  id: string;
  ownerId: string;
  owner?: UserProfile;
  title: string;
  workoutType: WorkoutType;
  intensity: Intensity;
  gymName: string;
  gymAddress: string | null;
  lat: number;
  lng: number;
  startTime: string; // ISO date
  durationMinutes: number;
  slots: number;
  slotsAvailable: number;
  notes: string | null;
  createdAt: string;
  distance?: number; // km, calculated
}

// Like
export interface Like {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: string;
}

// Match
export interface Match {
  id: string;
  userAId: string;
  userBId: string;
  otherUser: UserProfile;
  lastMessage: Message | null;
  createdAt: string;
}

// Message
export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

// Join Request
export interface JoinRequest {
  id: string;
  sessionId: string;
  requesterId: string;
  requester?: UserProfile;
  status: JoinRequestStatus;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Auth
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
}

// Feed filters
export interface FeedFilters {
  lat: number;
  lng: number;
  radiusKm?: number;
  goals?: Goal[];
  level?: Level;
  sameGymOnly?: boolean;
  availability?: TimeSlot[];
}

// Session filters
export interface SessionFilters {
  lat: number;
  lng: number;
  radiusKm?: number;
  timeFrom?: string;
  timeTo?: string;
  workoutType?: WorkoutType;
}



