import { z } from 'zod';
import {
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

// Auth validators
export const loginSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens zijn')
});

export const registerSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens zijn'),
  name: z.string().min(2, 'Naam moet minimaal 2 tekens zijn').max(50)
});

// Availability validator
export const availabilitySchema = z.object({
  day: z.enum(WEEKDAYS),
  timeSlots: z.array(z.enum(TIME_SLOTS)).min(1)
});

// Profile update validator
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  ageRange: z.enum(AGE_RANGES).optional().nullable(),
  gymName: z.string().max(100).optional().nullable(),
  gymAddress: z.string().max(200).optional().nullable(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  preferredRadius: z.number().min(1).max(50).optional(),
  goals: z.array(z.enum(GOALS)).optional(),
  level: z.enum(LEVELS).optional().nullable(),
  trainingStyle: z.enum(TRAINING_STYLES).optional().nullable(),
  availability: z.array(availabilitySchema).optional(),
  interestTags: z.array(z.enum(INTEREST_TAGS)).optional()
});

// Session validators
export const createSessionSchema = z.object({
  title: z.string().min(3, 'Titel moet minimaal 3 tekens zijn').max(100),
  workoutType: z.enum(WORKOUT_TYPES),
  intensity: z.enum(INTENSITIES),
  gymName: z.string().min(2).max(100),
  gymAddress: z.string().max(200).optional().nullable(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  startTime: z.string().datetime(),
  durationMinutes: z.number().min(15).max(240),
  slots: z.number().min(1).max(5),
  notes: z.string().max(500).optional().nullable()
});

// Swipe validators
export const swipeSchema = z.object({
  toUserId: z.string().uuid()
});

// Message validator
export const sendMessageSchema = z.object({
  text: z.string().min(1, 'Bericht mag niet leeg zijn').max(1000)
});

// Join request validator
export const handleJoinRequestSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['accept', 'decline'])
});

// Feed filter validator
export const feedFilterSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusKm: z.number().min(1).max(50).optional().default(10),
  goals: z.array(z.enum(GOALS)).optional(),
  level: z.enum(LEVELS).optional(),
  sameGymOnly: z.boolean().optional().default(false),
  availability: z.array(z.enum(TIME_SLOTS)).optional()
});

// Session filter validator
export const sessionFilterSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusKm: z.number().min(1).max(50).optional().default(10),
  timeFrom: z.string().datetime().optional(),
  timeTo: z.string().datetime().optional(),
  workoutType: z.enum(WORKOUT_TYPES).optional()
});

// Type exports for inference
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SwipeInput = z.infer<typeof swipeSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type HandleJoinRequestInput = z.infer<typeof handleJoinRequestSchema>;
export type FeedFilterInput = z.infer<typeof feedFilterSchema>;
export type SessionFilterInput = z.infer<typeof sessionFilterSchema>;



