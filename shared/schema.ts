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
  digitalId: text("digital_id").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id),
  textAddress: text("text_address").notNull(),
  lat: doublePrecision("lat").default(0),
  lng: doublePrecision("lng").default(0),
  photoBuilding: text("photo_building"),
  photoGate: text("photo_gate"),
  photoDoor: text("photo_door"),
  preferredTime: text("preferred_time").default("morning"),
  preferredTimeSlot: text("preferred_time_slot"),
  specialNote: text("special_note"),
  fallbackOption: text("fallback_option").default("door"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fallbackContacts = pgTable("fallback_contacts", {
  id: serial("id").primaryKey(),
  addressId: integer("address_id").notNull().references(() => addresses.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  relationship: text("relationship"),
  textAddress: text("text_address"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  distanceKm: doublePrecision("distance_km"),
  requiresExtraFee: boolean("requires_extra_fee").default(false),
  extraFeeAcknowledged: boolean("extra_fee_acknowledged").default(false),
  scheduledDate: text("scheduled_date"),
  scheduledTimeSlot: text("scheduled_time_slot"),
  photoBuilding: text("photo_building"),
  photoGate: text("photo_gate"),
  photoDoor: text("photo_door"),
  specialNote: text("special_note"),
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
  preferredTimeSlot: true,
  specialNote: true,
  fallbackOption: true,
});

export const insertFallbackContactSchema = createInsertSchema(fallbackContacts).pick({
  addressId: true,
  name: true,
  phone: true,
  relationship: true,
  textAddress: true,
  lat: true,
  lng: true,
  distanceKm: true,
  requiresExtraFee: true,
  extraFeeAcknowledged: true,
  scheduledDate: true,
  scheduledTimeSlot: true,
  photoBuilding: true,
  photoGate: true,
  photoDoor: true,
  specialNote: true,
}).extend({
  lat: z.number({ required_error: "Location latitude is required" }).finite("Latitude must be a valid number"),
  lng: z.number({ required_error: "Location longitude is required" }).finite("Longitude must be a valid number"),
  textAddress: z.string().trim().min(5, "Address is required"),
  scheduledDate: z.string().trim().optional(),
  scheduledTimeSlot: z.string().trim().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addresses.$inferSelect;
export type InsertFallbackContact = z.infer<typeof insertFallbackContactSchema>;
export type FallbackContact = typeof fallbackContacts.$inferSelect;
