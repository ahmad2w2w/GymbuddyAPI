import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  name: text("name"),
  age: integer("age"),
  bio: text("bio"),
  profileImage: text("profile_image"),
  location: text("location"),
  experienceLevel: text("experience_level"), // Beginner, Intermediate, Advanced
  preferredWorkouts: text("preferred_workouts").array(), // Strength, Cardio, Yoga, etc.
  availableNow: boolean("available_now").default(false),
  preferredTimeSlots: text("preferred_time_slots").array(), // Morning, Afternoon, Evening, etc.
  workoutDuration: text("workout_duration"), // 30-45 mins, 60-90 mins, etc.
  availableTimeSlots: jsonb("available_time_slots"), // Specific available times per day
  preferredLocations: text("preferred_locations").array(), // Multiple preferred gyms/locations
  weeklyAvailability: jsonb("weekly_availability"), // Days and times when available
  whatsappNumber: text("whatsapp_number"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  rating: text("rating").default("5.0").notNull(),
  workoutCount: integer("workout_count").default(0).notNull(),
  isProfileComplete: boolean("is_profile_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workoutInvitations = pgTable("workout_invitations", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  message: text("message"),
  proposedTime: timestamp("proposed_time"),
  location: text("location").notNull(),
  workoutType: text("workout_type").notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, declined
  createdAt: timestamp("created_at").defaultNow(),
});

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  invitationId: integer("invitation_id").notNull(),
  senderId: integer("sender_id").notNull(),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const workoutSessions = pgTable("workout_sessions", {
  id: serial("id").primaryKey(),
  invitationId: integer("invitation_id").notNull(),
  scheduledTime: timestamp("scheduled_time").notNull(),
  location: text("location").notNull(),
  workoutType: text("workout_type").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
});

// Sessions table for authentication
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Authentication schemas
export const registerSchema = z.object({
  email: z.string().email("Ongeldig email adres"),
  password: z.string().min(8, "Wachtwoord moet minimaal 8 karakters bevatten"),
  confirmPassword: z.string(),
  name: z.string().min(2, "Naam moet minimaal 2 karakters bevatten"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Wachtwoorden komen niet overeen",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("Ongeldig email adres"),
  password: z.string().min(1, "Wachtwoord is verplicht"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  rating: true,
  workoutCount: true,
  createdAt: true,
  isProfileComplete: true,
});

export const profileSetupSchema = createInsertSchema(users).omit({
  id: true,
  email: true,
  password: true,
  rating: true,
  workoutCount: true,
  createdAt: true,
  isProfileComplete: true,
}).extend({
  name: z.string().min(2, "Naam is verplicht"),
  age: z.number().min(16, "Je moet minimaal 16 jaar oud zijn").max(99, "Ongeldige leeftijd"),
  location: z.string().min(1, "Locatie is verplicht"),
  experienceLevel: z.string().min(1, "Ervaring niveau is verplicht"),
  preferredWorkouts: z.array(z.string()).min(1, "Selecteer minimaal één workout type"),
});

export const insertWorkoutInvitationSchema = createInsertSchema(workoutInvitations).omit({
  id: true,
  createdAt: true,
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  sentAt: true,
});

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions).omit({
  id: true,
  createdAt: true,
}).extend({
  scheduledTime: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type ProfileSetup = z.infer<typeof profileSetupSchema>;
export type WorkoutInvitation = typeof workoutInvitations.$inferSelect;
export type InsertWorkoutInvitation = z.infer<typeof insertWorkoutInvitationSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
