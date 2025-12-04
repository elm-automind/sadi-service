import { pgTable, text, serial, integer, boolean, jsonb, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  iqamaId: text("iqama_id").notNull().unique(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  digitalId: text("digital_id").notNull().unique(), // The 8-char ID
  userId: integer("user_id").notNull().references(() => users.id),
  textAddress: text("text_address").notNull(),
  lat: doublePrecision("lat").default(0),
  lng: doublePrecision("lng").default(0),
  // Store photo filenames/urls
  photoBuilding: text("photo_building"),
  photoGate: text("photo_gate"),
  photoDoor: text("photo_door"),
  // Instructions
  preferredTime: text("preferred_time").default("morning"),
  specialNote: text("special_note"),
  fallbackOption: text("fallback_option").default("door"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  iqamaId: true,
  email: true,
  phone: true,
  name: true,
  password: true,
});

export const insertAddressSchema = createInsertSchema(addresses).pick({
  digitalId: true,
  userId: true,
  textAddress: true,
  lat: true,
  lng: true,
  photoBuilding: true,
  photoGate: true,
  photoDoor: true,
  preferredTime: true,
  specialNote: true,
  fallbackOption: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addresses.$inferSelect;
