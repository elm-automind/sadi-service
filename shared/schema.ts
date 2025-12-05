import { pgTable, text, serial, integer, boolean, jsonb, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const accountTypeEnum = ["individual", "company"] as const;
export type AccountType = typeof accountTypeEnum[number];

export const companyTypeEnum = ["Logistics", "Courier", "E-commerce", "Marketplace", "Grocery", "Pharmacy"] as const;
export type CompanyType = typeof companyTypeEnum[number];

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  accountType: text("account_type").notNull().default("individual"),
  iqamaId: text("iqama_id"),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const companyProfiles = pgTable("company_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  companyName: text("company_name").notNull(),
  unifiedNumber: text("unified_number").notNull().unique(),
  companyType: text("company_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const companyAddresses = pgTable("company_addresses", {
  id: serial("id").primaryKey(),
  companyProfileId: integer("company_profile_id").notNull().references(() => companyProfiles.id).unique(),
  street: text("street").notNull(),
  district: text("district").notNull(),
  city: text("city").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const billingCycleEnum = ["monthly", "annual"] as const;
export type BillingCycle = typeof billingCycleEnum[number];

export const subscriptionStatusEnum = ["active", "cancelled", "expired", "pending"] as const;
export type SubscriptionStatus = typeof subscriptionStatusEnum[number];

export const pricingPlans = pgTable("pricing_plans", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  monthlyPrice: doublePrecision("monthly_price").notNull(),
  annualPrice: doublePrecision("annual_price").notNull(),
  features: text("features").array().notNull(),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const companySubscriptions = pgTable("company_subscriptions", {
  id: serial("id").primaryKey(),
  companyProfileId: integer("company_profile_id").notNull().references(() => companyProfiles.id).unique(),
  pricingPlanId: integer("pricing_plan_id").notNull().references(() => pricingPlans.id),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  status: text("status").notNull().default("active"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  isPrimary: boolean("is_primary").default(false),
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

export const passwordResetOtps = pgTable("password_reset_otps", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  email: text("email").notNull(),
  otp: text("otp").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  accountType: true,
  iqamaId: true,
  email: true,
  phone: true,
  name: true,
  password: true,
});

export const insertCompanyProfileSchema = createInsertSchema(companyProfiles).pick({
  userId: true,
  companyName: true,
  unifiedNumber: true,
  companyType: true,
});

export const companyRegistrationSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  unifiedNumber: z.string().min(5, "Unified number is required"),
  companyType: z.enum(companyTypeEnum, { required_error: "Company type is required" }),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(9, "Mobile number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertCompanyAddressSchema = createInsertSchema(companyAddresses).pick({
  companyProfileId: true,
  street: true,
  district: true,
  city: true,
});

export const companyAddressFormSchema = z.object({
  street: z.string().min(3, "Street is required"),
  district: z.string().min(2, "District is required"),
  city: z.string().min(2, "City is required"),
});

export const insertPricingPlanSchema = createInsertSchema(pricingPlans).pick({
  slug: true,
  name: true,
  monthlyPrice: true,
  annualPrice: true,
  features: true,
  isDefault: true,
  isActive: true,
  sortOrder: true,
});

export const insertCompanySubscriptionSchema = createInsertSchema(companySubscriptions).pick({
  companyProfileId: true,
  pricingPlanId: true,
  billingCycle: true,
  status: true,
});

export const subscriptionFormSchema = z.object({
  pricingPlanId: z.number().min(1, "Please select a pricing plan"),
  billingCycle: z.enum(billingCycleEnum),
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
  isPrimary: true,
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
export type InsertCompanyProfile = z.infer<typeof insertCompanyProfileSchema>;
export type CompanyProfile = typeof companyProfiles.$inferSelect;
export type CompanyRegistration = z.infer<typeof companyRegistrationSchema>;
export type InsertCompanyAddress = z.infer<typeof insertCompanyAddressSchema>;
export type CompanyAddress = typeof companyAddresses.$inferSelect;
export type CompanyAddressForm = z.infer<typeof companyAddressFormSchema>;
export type InsertPricingPlan = z.infer<typeof insertPricingPlanSchema>;
export type PricingPlan = typeof pricingPlans.$inferSelect;
export type InsertCompanySubscription = z.infer<typeof insertCompanySubscriptionSchema>;
export type CompanySubscription = typeof companySubscriptions.$inferSelect;
export type SubscriptionForm = z.infer<typeof subscriptionFormSchema>;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addresses.$inferSelect;
export type InsertFallbackContact = z.infer<typeof insertFallbackContactSchema>;
export type FallbackContact = typeof fallbackContacts.$inferSelect;
export type PasswordResetOtp = typeof passwordResetOtps.$inferSelect;
