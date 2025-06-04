import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  bio: text("bio"),
  profileImage: text("profile_image"),
  location: text("location").notNull(),
  experienceLevel: text("experience_level").notNull(), // Beginner, Intermediate, Advanced
  preferredWorkouts: text("preferred_workouts").array().notNull(), // Strength, Cardio, Yoga, etc.
  availableNow: boolean("available_now").default(false),
  preferredTimeSlots: text("preferred_time_slots").array(), // Morning, Afternoon, Evening, etc.
  workoutDuration: text("workout_duration"), // 30-45 mins, 60-90 mins, etc.
  whatsappNumber: text("whatsapp_number"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  rating: text("rating").default("5.0").notNull(),
  workoutCount: integer("workout_count").default(0).notNull(),
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

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  rating: true,
  workoutCount: true,
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
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type WorkoutInvitation = typeof workoutInvitations.$inferSelect;
export type InsertWorkoutInvitation = z.infer<typeof insertWorkoutInvitationSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
