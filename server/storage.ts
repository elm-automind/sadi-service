import { 
  type User, type InsertUser, type Address, type InsertAddress,
  type FallbackContact, type InsertFallbackContact, type PasswordResetOtp,
  type CompanyProfile, type InsertCompanyProfile,
  type CompanyAddress, type InsertCompanyAddress,
  type PricingPlan, type InsertPricingPlan,
  type CompanySubscription, type InsertCompanySubscription,
  type CompanyDriver, type InsertCompanyDriver,
  type ShipmentLookup, type InsertShipmentLookup,
  type DriverFeedback, type InsertDriverFeedback,
  type DeliveryOutcome, type InsertDeliveryOutcome,
  users, addresses, fallbackContacts, passwordResetOtps, companyProfiles,
  companyAddresses, pricingPlans, companySubscriptions, companyDrivers,
  shipmentLookups, driverFeedback, deliveryOutcomes
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gt, lt, asc, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByIqama(iqamaId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByUnifiedNumber(unifiedNumber: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  
  createCompanyProfile(profile: InsertCompanyProfile): Promise<CompanyProfile>;
  getCompanyProfileByUserId(userId: number): Promise<CompanyProfile | undefined>;
  getCompanyProfileByUnifiedNumber(unifiedNumber: string): Promise<CompanyProfile | undefined>;
  
  getCompanyAddressByProfileId(companyProfileId: number): Promise<CompanyAddress | undefined>;
  createCompanyAddress(address: InsertCompanyAddress): Promise<CompanyAddress>;
  updateCompanyAddress(companyProfileId: number, address: Partial<CompanyAddress>): Promise<CompanyAddress | undefined>;

  getPricingPlans(): Promise<PricingPlan[]>;
  getPricingPlanById(id: number): Promise<PricingPlan | undefined>;

  getCompanySubscription(companyProfileId: number): Promise<CompanySubscription | undefined>;
  createCompanySubscription(subscription: InsertCompanySubscription): Promise<CompanySubscription>;
  updateCompanySubscription(companyProfileId: number, updates: Partial<CompanySubscription>): Promise<CompanySubscription | undefined>;

  getCompanyDrivers(companyProfileId: number): Promise<CompanyDriver[]>;
  getCompanyDriverById(id: number): Promise<CompanyDriver | undefined>;
  getCompanyDriverByDriverId(companyProfileId: number, driverId: string): Promise<CompanyDriver | undefined>;
  getDriverWithCompanyName(driverId: string): Promise<{ driver: CompanyDriver; companyName: string } | undefined>;
  createCompanyDriver(driver: InsertCompanyDriver): Promise<CompanyDriver>;
  updateCompanyDriver(id: number, updates: Partial<CompanyDriver>): Promise<CompanyDriver | undefined>;
  deleteCompanyDriver(id: number): Promise<boolean>;
  
  createAddress(address: InsertAddress): Promise<Address>;
  getAddressById(id: number): Promise<Address | undefined>;
  getAddressesByUserId(userId: number): Promise<Address[]>;
  getAddressByDigitalId(digitalId: string): Promise<Address | undefined>;
  updateAddress(id: number, address: Partial<Address>): Promise<Address | undefined>;

  createFallbackContact(contact: InsertFallbackContact): Promise<FallbackContact>;
  getFallbackContactsByAddressId(addressId: number): Promise<FallbackContact[]>;
  getFallbackContactById(id: number): Promise<FallbackContact | undefined>;
  updateFallbackContact(id: number, updates: Partial<FallbackContact>): Promise<FallbackContact | undefined>;
  deleteFallbackContact(id: number): Promise<boolean>;
  deleteFallbackContactsByAddressId(addressId: number): Promise<void>;
  deleteAddress(id: number): Promise<boolean>;
  clearPrimaryAddresses(userId: number): Promise<void>;
  setDefaultAddress(userId: number, addressId: number): Promise<Address | undefined>;
  clearDefaultFallbackContacts(addressId: number): Promise<void>;
  setDefaultFallbackContact(addressId: number, contactId: number): Promise<FallbackContact | undefined>;

  createPasswordResetOtp(userId: number, email: string, otp: string, expiresAt: Date): Promise<PasswordResetOtp>;
  getValidOtp(email: string, otp: string): Promise<PasswordResetOtp | undefined>;
  markOtpAsUsed(otpId: number): Promise<void>;
  deleteExpiredOtps(): Promise<void>;

  createShipmentLookup(lookup: InsertShipmentLookup): Promise<ShipmentLookup>;
  getShipmentLookupById(id: number): Promise<ShipmentLookup | undefined>;
  getPendingFeedbackByDriver(driverId: string, companyName: string): Promise<ShipmentLookup | undefined>;
  updateShipmentLookupStatus(id: number, status: string): Promise<ShipmentLookup | undefined>;
  updateShipmentLookupDeliveryStatus(id: number, deliveryStatus: string): Promise<ShipmentLookup | undefined>;
  
  createDriverFeedback(feedback: InsertDriverFeedback): Promise<DriverFeedback>;
  getDriverFeedbackByLookupId(shipmentLookupId: number): Promise<DriverFeedback | undefined>;
  getDriverFeedbackByAddressDigitalId(addressDigitalId: string): Promise<DriverFeedback[]>;
  getDriverFeedbackByDriverId(driverId: string): Promise<DriverFeedback[]>;

  createDeliveryOutcome(outcome: InsertDeliveryOutcome): Promise<DeliveryOutcome>;
  getDeliveryOutcomesByAddressDigitalId(addressDigitalId: string): Promise<DeliveryOutcome[]>;
  getDeliveryOutcomesByDriverId(driverId: string): Promise<DeliveryOutcome[]>;
  
  getDeliveryStatsByCompany(companyName: string): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    successRate: number;
    avgLocationScore: number;
  }>;
  getAddressDeliveryStats(companyName: string): Promise<{
    addressDigitalId: string;
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    avgLocationScore: number;
    creditScore: number;
    lastDeliveryDate: string | null;
    lat: number | null;
    lng: number | null;
    textAddress: string | null;
  }[]>;

  getDeliveryHotspots(companyName: string): Promise<{
    points: {
      lat: number;
      lng: number;
      addressDigitalId: string;
      lookupCount: number;
      completedCount: number;
      failedCount: number;
      avgLocationScore: number;
      successRate: number;
      lastEventAt: string | null;
      textAddress: string | null;
      intensity: number;
    }[];
    summary: {
      totalLookups: number;
      totalCompleted: number;
      totalFailed: number;
      avgSuccessRate: number;
      avgLocationScore: number;
      uniqueAddresses: number;
    };
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByIqama(iqamaId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.iqamaId, iqamaId));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async getUserByUnifiedNumber(unifiedNumber: string): Promise<User | undefined> {
    const [profile] = await db.select().from(companyProfiles).where(eq(companyProfiles.unifiedNumber, unifiedNumber));
    if (!profile) return undefined;
    const [user] = await db.select().from(users).where(eq(users.id, profile.userId));
    return user || undefined;
  }

  async createCompanyProfile(insertProfile: InsertCompanyProfile): Promise<CompanyProfile> {
    const [profile] = await db
      .insert(companyProfiles)
      .values(insertProfile)
      .returning();
    return profile;
  }

  async getCompanyProfileByUserId(userId: number): Promise<CompanyProfile | undefined> {
    const [profile] = await db.select().from(companyProfiles).where(eq(companyProfiles.userId, userId));
    return profile || undefined;
  }

  async getCompanyProfileByUnifiedNumber(unifiedNumber: string): Promise<CompanyProfile | undefined> {
    const [profile] = await db.select().from(companyProfiles).where(eq(companyProfiles.unifiedNumber, unifiedNumber));
    return profile || undefined;
  }

  async getCompanyAddressByProfileId(companyProfileId: number): Promise<CompanyAddress | undefined> {
    const [address] = await db.select().from(companyAddresses).where(eq(companyAddresses.companyProfileId, companyProfileId));
    return address || undefined;
  }

  async createCompanyAddress(insertAddress: InsertCompanyAddress): Promise<CompanyAddress> {
    const [address] = await db
      .insert(companyAddresses)
      .values(insertAddress)
      .returning();
    return address;
  }

  async updateCompanyAddress(companyProfileId: number, updates: Partial<CompanyAddress>): Promise<CompanyAddress | undefined> {
    const [updated] = await db
      .update(companyAddresses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companyAddresses.companyProfileId, companyProfileId))
      .returning();
    return updated || undefined;
  }

  async getPricingPlans(): Promise<PricingPlan[]> {
    return await db.select().from(pricingPlans).where(eq(pricingPlans.isActive, true)).orderBy(asc(pricingPlans.sortOrder));
  }

  async getPricingPlanById(id: number): Promise<PricingPlan | undefined> {
    const [plan] = await db.select().from(pricingPlans).where(eq(pricingPlans.id, id));
    return plan || undefined;
  }

  async getCompanySubscription(companyProfileId: number): Promise<CompanySubscription | undefined> {
    const [subscription] = await db.select().from(companySubscriptions).where(eq(companySubscriptions.companyProfileId, companyProfileId));
    return subscription || undefined;
  }

  async createCompanySubscription(insertSubscription: InsertCompanySubscription): Promise<CompanySubscription> {
    const [subscription] = await db
      .insert(companySubscriptions)
      .values(insertSubscription)
      .returning();
    return subscription;
  }

  async updateCompanySubscription(companyProfileId: number, updates: Partial<CompanySubscription>): Promise<CompanySubscription | undefined> {
    const [updated] = await db
      .update(companySubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companySubscriptions.companyProfileId, companyProfileId))
      .returning();
    return updated || undefined;
  }

  async getCompanyDrivers(companyProfileId: number): Promise<CompanyDriver[]> {
    return await db.select().from(companyDrivers).where(eq(companyDrivers.companyProfileId, companyProfileId));
  }

  async getCompanyDriverById(id: number): Promise<CompanyDriver | undefined> {
    const [driver] = await db.select().from(companyDrivers).where(eq(companyDrivers.id, id));
    return driver || undefined;
  }

  async getCompanyDriverByDriverId(companyProfileId: number, driverId: string): Promise<CompanyDriver | undefined> {
    const [driver] = await db.select().from(companyDrivers).where(
      and(
        eq(companyDrivers.companyProfileId, companyProfileId),
        eq(companyDrivers.driverId, driverId)
      )
    );
    return driver || undefined;
  }

  async getDriverWithCompanyName(driverId: string): Promise<{ driver: CompanyDriver; companyName: string } | undefined> {
    const normalizedDriverId = String(driverId).trim().toLowerCase();
    
    const allDrivers = await db.select().from(companyDrivers);
    const driver = allDrivers.find(d => 
      String(d.driverId).trim().toLowerCase() === normalizedDriverId && 
      d.status === "active"
    );
    
    if (!driver) {
      return undefined;
    }
    
    const [profile] = await db.select().from(companyProfiles).where(
      eq(companyProfiles.id, driver.companyProfileId)
    );
    
    if (!profile) {
      return undefined;
    }
    
    return {
      driver,
      companyName: profile.companyName
    };
  }

  async createCompanyDriver(insertDriver: InsertCompanyDriver): Promise<CompanyDriver> {
    const [driver] = await db
      .insert(companyDrivers)
      .values(insertDriver)
      .returning();
    return driver;
  }

  async updateCompanyDriver(id: number, updates: Partial<CompanyDriver>): Promise<CompanyDriver | undefined> {
    const [updated] = await db
      .update(companyDrivers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companyDrivers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCompanyDriver(id: number): Promise<boolean> {
    const [deleted] = await db.delete(companyDrivers).where(eq(companyDrivers.id, id)).returning();
    return !!deleted;
  }

  async createAddress(insertAddress: InsertAddress): Promise<Address> {
    const [address] = await db
      .insert(addresses)
      .values(insertAddress)
      .returning();
    return address;
  }

  async getAddressById(id: number): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
    return address || undefined;
  }

  async getAddressesByUserId(userId: number): Promise<Address[]> {
    return await db.select().from(addresses).where(eq(addresses.userId, userId));
  }

  async getAddressByDigitalId(digitalId: string): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.digitalId, digitalId));
    return address || undefined;
  }

  async updateAddress(id: number, updates: Partial<Address>): Promise<Address | undefined> {
    const [updated] = await db
      .update(addresses)
      .set(updates)
      .where(eq(addresses.id, id))
      .returning();
    return updated || undefined;
  }

  async createFallbackContact(insertContact: InsertFallbackContact): Promise<FallbackContact> {
    const [contact] = await db
      .insert(fallbackContacts)
      .values(insertContact)
      .returning();
    return contact;
  }

  async getFallbackContactsByAddressId(addressId: number): Promise<FallbackContact[]> {
    return await db.select().from(fallbackContacts).where(eq(fallbackContacts.addressId, addressId));
  }

  async getFallbackContactById(id: number): Promise<FallbackContact | undefined> {
    const [contact] = await db.select().from(fallbackContacts).where(eq(fallbackContacts.id, id));
    return contact || undefined;
  }

  async updateFallbackContact(id: number, updates: Partial<FallbackContact>): Promise<FallbackContact | undefined> {
    const [updated] = await db
      .update(fallbackContacts)
      .set(updates)
      .where(eq(fallbackContacts.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteFallbackContact(id: number): Promise<boolean> {
    const [deleted] = await db.delete(fallbackContacts).where(eq(fallbackContacts.id, id)).returning();
    return !!deleted;
  }

  async deleteFallbackContactsByAddressId(addressId: number): Promise<void> {
    await db.delete(fallbackContacts).where(eq(fallbackContacts.addressId, addressId));
  }

  async deleteAddress(id: number): Promise<boolean> {
    const [deleted] = await db.delete(addresses).where(eq(addresses.id, id)).returning();
    return !!deleted;
  }

  async clearPrimaryAddresses(userId: number): Promise<void> {
    await db
      .update(addresses)
      .set({ isPrimary: false })
      .where(eq(addresses.userId, userId));
  }

  async setDefaultAddress(userId: number, addressId: number): Promise<Address | undefined> {
    await this.clearPrimaryAddresses(userId);
    const [updated] = await db
      .update(addresses)
      .set({ isPrimary: true })
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async clearDefaultFallbackContacts(addressId: number): Promise<void> {
    await db
      .update(fallbackContacts)
      .set({ isDefault: false })
      .where(eq(fallbackContacts.addressId, addressId));
  }

  async setDefaultFallbackContact(addressId: number, contactId: number): Promise<FallbackContact | undefined> {
    await this.clearDefaultFallbackContacts(addressId);
    const [updated] = await db
      .update(fallbackContacts)
      .set({ isDefault: true })
      .where(and(eq(fallbackContacts.id, contactId), eq(fallbackContacts.addressId, addressId)))
      .returning();
    return updated || undefined;
  }

  async createPasswordResetOtp(userId: number, email: string, otp: string, expiresAt: Date): Promise<PasswordResetOtp> {
    const [resetOtp] = await db
      .insert(passwordResetOtps)
      .values({ userId, email, otp, expiresAt })
      .returning();
    return resetOtp;
  }

  async getValidOtp(email: string, otp: string): Promise<PasswordResetOtp | undefined> {
    const now = new Date();
    const [resetOtp] = await db
      .select()
      .from(passwordResetOtps)
      .where(
        and(
          eq(passwordResetOtps.email, email),
          eq(passwordResetOtps.otp, otp),
          eq(passwordResetOtps.used, false),
          gt(passwordResetOtps.expiresAt, now)
        )
      );
    return resetOtp || undefined;
  }

  async markOtpAsUsed(otpId: number): Promise<void> {
    await db
      .update(passwordResetOtps)
      .set({ used: true })
      .where(eq(passwordResetOtps.id, otpId));
  }

  async deleteExpiredOtps(): Promise<void> {
    const now = new Date();
    await db.delete(passwordResetOtps).where(lt(passwordResetOtps.expiresAt, now));
  }

  async createShipmentLookup(insertLookup: InsertShipmentLookup): Promise<ShipmentLookup> {
    const [lookup] = await db
      .insert(shipmentLookups)
      .values(insertLookup)
      .returning();
    return lookup;
  }

  async getShipmentLookupById(id: number): Promise<ShipmentLookup | undefined> {
    const [lookup] = await db.select().from(shipmentLookups).where(eq(shipmentLookups.id, id));
    return lookup || undefined;
  }

  async getPendingFeedbackByDriver(driverId: string, companyName: string): Promise<ShipmentLookup | undefined> {
    const normalizedDriverId = driverId.toLowerCase().trim();
    const normalizedCompanyName = companyName.toLowerCase().trim();
    
    const results = await db
      .select()
      .from(shipmentLookups)
      .where(eq(shipmentLookups.status, "pending_feedback"))
      .orderBy(asc(shipmentLookups.createdAt));
    
    const match = results.find(lookup => 
      lookup.driverId.toLowerCase().trim() === normalizedDriverId &&
      lookup.companyName.toLowerCase().trim() === normalizedCompanyName
    );
    
    return match || undefined;
  }

  async updateShipmentLookupStatus(id: number, status: string): Promise<ShipmentLookup | undefined> {
    const [updated] = await db
      .update(shipmentLookups)
      .set({ status })
      .where(eq(shipmentLookups.id, id))
      .returning();
    return updated || undefined;
  }

  async createDriverFeedback(insertFeedback: InsertDriverFeedback): Promise<DriverFeedback> {
    const [feedback] = await db
      .insert(driverFeedback)
      .values(insertFeedback)
      .returning();
    return feedback;
  }

  async getDriverFeedbackByLookupId(shipmentLookupId: number): Promise<DriverFeedback | undefined> {
    const [feedback] = await db.select().from(driverFeedback).where(eq(driverFeedback.shipmentLookupId, shipmentLookupId));
    return feedback || undefined;
  }

  async getDriverFeedbackByAddressDigitalId(addressDigitalId: string): Promise<DriverFeedback[]> {
    return await db.select().from(driverFeedback).where(eq(driverFeedback.addressDigitalId, addressDigitalId));
  }

  async getDriverFeedbackByDriverId(driverId: string): Promise<DriverFeedback[]> {
    return await db.select().from(driverFeedback).where(eq(driverFeedback.driverId, driverId));
  }

  async updateShipmentLookupDeliveryStatus(id: number, deliveryStatus: string): Promise<ShipmentLookup | undefined> {
    const [updated] = await db
      .update(shipmentLookups)
      .set({ deliveryStatus, deliveryCompletedAt: new Date() })
      .where(eq(shipmentLookups.id, id))
      .returning();
    return updated || undefined;
  }

  async createDeliveryOutcome(insertOutcome: InsertDeliveryOutcome): Promise<DeliveryOutcome> {
    const [outcome] = await db
      .insert(deliveryOutcomes)
      .values(insertOutcome)
      .returning();
    return outcome;
  }

  async getDeliveryOutcomesByAddressDigitalId(addressDigitalId: string): Promise<DeliveryOutcome[]> {
    return await db.select().from(deliveryOutcomes).where(eq(deliveryOutcomes.addressDigitalId, addressDigitalId));
  }

  async getDeliveryOutcomesByDriverId(driverId: string): Promise<DeliveryOutcome[]> {
    return await db.select().from(deliveryOutcomes).where(eq(deliveryOutcomes.driverId, driverId));
  }

  async getDeliveryStatsByCompany(companyName: string): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    successRate: number;
    avgLocationScore: number;
  }> {
    const normalizedCompanyName = String(companyName).trim().toLowerCase();
    const allFeedbacks = await db.select().from(driverFeedback);
    const feedbacks = allFeedbacks.filter(f => 
      String(f.companyName).trim().toLowerCase() === normalizedCompanyName
    );
    
    const totalDeliveries = feedbacks.length;
    const successfulDeliveries = feedbacks.filter(f => f.deliveryStatus === "delivered").length;
    const failedDeliveries = feedbacks.filter(f => f.deliveryStatus === "failed").length;
    const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;
    
    const locationScores = feedbacks.map(f => f.locationScore).filter(s => s !== null) as number[];
    const avgLocationScore = locationScores.length > 0 
      ? locationScores.reduce((a, b) => a + b, 0) / locationScores.length 
      : 0;

    return {
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      successRate: Math.round(successRate * 10) / 10,
      avgLocationScore: Math.round(avgLocationScore * 10) / 10,
    };
  }

  async getAddressDeliveryStats(companyName: string): Promise<{
    addressDigitalId: string;
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    avgLocationScore: number;
    creditScore: number;
    lastDeliveryDate: string | null;
    lat: number | null;
    lng: number | null;
    textAddress: string | null;
  }[]> {
    const normalizedCompanyName = String(companyName).trim().toLowerCase();
    const allFeedbacks = await db.select().from(driverFeedback);
    const feedbacks = allFeedbacks.filter(f => 
      String(f.companyName).trim().toLowerCase() === normalizedCompanyName
    );
    
    const addressMap = new Map<string, {
      totalDeliveries: number;
      successfulDeliveries: number;
      failedDeliveries: number;
      locationScores: number[];
      lastDeliveryDate: Date | null;
    }>();

    for (const feedback of feedbacks) {
      if (!feedback.addressDigitalId) continue;
      
      const existing = addressMap.get(feedback.addressDigitalId) || {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        locationScores: [],
        lastDeliveryDate: null,
      };

      existing.totalDeliveries++;
      if (feedback.deliveryStatus === "delivered") existing.successfulDeliveries++;
      if (feedback.deliveryStatus === "failed") existing.failedDeliveries++;
      if (feedback.locationScore) existing.locationScores.push(feedback.locationScore);
      
      const feedbackDate = feedback.createdAt ? new Date(feedback.createdAt) : null;
      if (feedbackDate && (!existing.lastDeliveryDate || feedbackDate > existing.lastDeliveryDate)) {
        existing.lastDeliveryDate = feedbackDate;
      }

      addressMap.set(feedback.addressDigitalId, existing);
    }

    const results: {
      addressDigitalId: string;
      totalDeliveries: number;
      successfulDeliveries: number;
      failedDeliveries: number;
      avgLocationScore: number;
      creditScore: number;
      lastDeliveryDate: string | null;
      lat: number | null;
      lng: number | null;
      textAddress: string | null;
    }[] = [];

    for (const [addressDigitalId, stats] of Array.from(addressMap.entries())) {
      const address = await db.select().from(addresses).where(eq(addresses.digitalId, addressDigitalId)).then((rows: Address[]) => rows[0]);
      
      const avgLocationScore = stats.locationScores.length > 0
        ? stats.locationScores.reduce((a, b) => a + b, 0) / stats.locationScores.length
        : 0;

      const successRate = stats.totalDeliveries > 0 
        ? (stats.successfulDeliveries / stats.totalDeliveries) * 100 
        : 0;
      const creditScore = Math.round((successRate * 0.6) + (avgLocationScore * 8));

      results.push({
        addressDigitalId,
        totalDeliveries: stats.totalDeliveries,
        successfulDeliveries: stats.successfulDeliveries,
        failedDeliveries: stats.failedDeliveries,
        avgLocationScore: Math.round(avgLocationScore * 10) / 10,
        creditScore: Math.min(100, Math.max(0, creditScore)),
        lastDeliveryDate: stats.lastDeliveryDate?.toISOString() || null,
        lat: address?.lat || null,
        lng: address?.lng || null,
        textAddress: address?.textAddress || null,
      });
    }

    return results.sort((a, b) => b.totalDeliveries - a.totalDeliveries);
  }

  async getDeliveryHotspots(companyName: string): Promise<{
    points: {
      lat: number;
      lng: number;
      addressDigitalId: string;
      lookupCount: number;
      completedCount: number;
      failedCount: number;
      avgLocationScore: number;
      successRate: number;
      lastEventAt: string | null;
      textAddress: string | null;
      intensity: number;
    }[];
    summary: {
      totalLookups: number;
      totalCompleted: number;
      totalFailed: number;
      avgSuccessRate: number;
      avgLocationScore: number;
      uniqueAddresses: number;
    };
  }> {
    const normalizedCompanyName = String(companyName).trim().toLowerCase();
    
    // Get all shipment lookups for this company (driver address access events)
    const allLookups = await db.select().from(shipmentLookups);
    const companyLookups = allLookups.filter(l => 
      String(l.companyName).trim().toLowerCase() === normalizedCompanyName
    );
    
    // Get all driver feedback for this company (completed deliveries)
    const allFeedbacks = await db.select().from(driverFeedback);
    const companyFeedbacks = allFeedbacks.filter(f => 
      String(f.companyName).trim().toLowerCase() === normalizedCompanyName
    );
    
    // Get all delivery outcomes for this company
    const allOutcomes = await db.select().from(deliveryOutcomes);
    const companyOutcomes = allOutcomes.filter(o => 
      String(o.companyName).trim().toLowerCase() === normalizedCompanyName
    );
    
    // Aggregate data by addressDigitalId
    const addressMap = new Map<string, {
      lookupCount: number;
      completedCount: number;
      failedCount: number;
      locationScores: number[];
      lastEventAt: Date | null;
    }>();
    
    // Process lookups (address access events)
    for (const lookup of companyLookups) {
      if (!lookup.addressDigitalId) continue;
      
      const existing = addressMap.get(lookup.addressDigitalId) || {
        lookupCount: 0,
        completedCount: 0,
        failedCount: 0,
        locationScores: [],
        lastEventAt: null,
      };
      
      existing.lookupCount++;
      
      const lookupDate = lookup.createdAt ? new Date(lookup.createdAt) : null;
      if (lookupDate && (!existing.lastEventAt || lookupDate > existing.lastEventAt)) {
        existing.lastEventAt = lookupDate;
      }
      
      addressMap.set(lookup.addressDigitalId, existing);
    }
    
    // Process feedback (delivery completions with location scores)
    for (const feedback of companyFeedbacks) {
      if (!feedback.addressDigitalId) continue;
      
      const existing = addressMap.get(feedback.addressDigitalId) || {
        lookupCount: 0,
        completedCount: 0,
        failedCount: 0,
        locationScores: [],
        lastEventAt: null,
      };
      
      if (feedback.locationScore) {
        existing.locationScores.push(feedback.locationScore);
      }
      
      const feedbackDate = feedback.createdAt ? new Date(feedback.createdAt) : null;
      if (feedbackDate && (!existing.lastEventAt || feedbackDate > existing.lastEventAt)) {
        existing.lastEventAt = feedbackDate;
      }
      
      addressMap.set(feedback.addressDigitalId, existing);
    }
    
    // Process delivery outcomes (actual delivery results)
    for (const outcome of companyOutcomes) {
      if (!outcome.addressDigitalId) continue;
      
      const existing = addressMap.get(outcome.addressDigitalId) || {
        lookupCount: 0,
        completedCount: 0,
        failedCount: 0,
        locationScores: [],
        lastEventAt: null,
      };
      
      if (outcome.deliveryStatus === "delivered") {
        existing.completedCount++;
      } else if (outcome.deliveryStatus === "failed") {
        existing.failedCount++;
      }
      
      const outcomeDate = outcome.createdAt ? new Date(outcome.createdAt) : null;
      if (outcomeDate && (!existing.lastEventAt || outcomeDate > existing.lastEventAt)) {
        existing.lastEventAt = outcomeDate;
      }
      
      addressMap.set(outcome.addressDigitalId, existing);
    }
    
    // Build hotspot points with address coordinates
    const points: {
      lat: number;
      lng: number;
      addressDigitalId: string;
      lookupCount: number;
      completedCount: number;
      failedCount: number;
      avgLocationScore: number;
      successRate: number;
      lastEventAt: string | null;
      textAddress: string | null;
      intensity: number;
    }[] = [];
    
    // Find max lookup count for intensity normalization
    let maxLookupCount = 1;
    for (const stats of Array.from(addressMap.values())) {
      if (stats.lookupCount > maxLookupCount) maxLookupCount = stats.lookupCount;
    }
    
    for (const [addressDigitalId, stats] of Array.from(addressMap.entries())) {
      // Get address coordinates
      const address = await db.select().from(addresses)
        .where(eq(addresses.digitalId, addressDigitalId))
        .then((rows: Address[]) => rows[0]);
      
      // Only include addresses with valid coordinates
      if (!address || address.lat === null || address.lng === null) continue;
      
      const avgLocationScore = stats.locationScores.length > 0
        ? stats.locationScores.reduce((a, b) => a + b, 0) / stats.locationScores.length
        : 0;
      
      const totalDeliveries = stats.completedCount + stats.failedCount;
      const successRate = totalDeliveries > 0
        ? (stats.completedCount / totalDeliveries) * 100
        : 0;
      
      // Calculate intensity based on lookup count (0-1 scale)
      const intensity = stats.lookupCount / maxLookupCount;
      
      points.push({
        lat: address.lat,
        lng: address.lng,
        addressDigitalId,
        lookupCount: stats.lookupCount,
        completedCount: stats.completedCount,
        failedCount: stats.failedCount,
        avgLocationScore: Math.round(avgLocationScore * 10) / 10,
        successRate: Math.round(successRate * 10) / 10,
        lastEventAt: stats.lastEventAt?.toISOString() || null,
        textAddress: address.textAddress || null,
        intensity: Math.round(intensity * 100) / 100,
      });
    }
    
    // Calculate summary stats
    const totalLookups = points.reduce((sum, p) => sum + p.lookupCount, 0);
    const totalCompleted = points.reduce((sum, p) => sum + p.completedCount, 0);
    const totalFailed = points.reduce((sum, p) => sum + p.failedCount, 0);
    
    const totalDeliveries = totalCompleted + totalFailed;
    const avgSuccessRate = totalDeliveries > 0 ? (totalCompleted / totalDeliveries) * 100 : 0;
    
    const allLocationScores = points.filter(p => p.avgLocationScore > 0).map(p => p.avgLocationScore);
    const avgLocationScore = allLocationScores.length > 0
      ? allLocationScores.reduce((a, b) => a + b, 0) / allLocationScores.length
      : 0;
    
    return {
      points: points.sort((a, b) => b.lookupCount - a.lookupCount),
      summary: {
        totalLookups,
        totalCompleted,
        totalFailed,
        avgSuccessRate: Math.round(avgSuccessRate * 10) / 10,
        avgLocationScore: Math.round(avgLocationScore * 10) / 10,
        uniqueAddresses: points.length,
      },
    };
  }
}

export const storage = new DatabaseStorage();

export const PRICING_PLANS_SEED: InsertPricingPlan[] = [
  {
    slug: "basic",
    name: "Basic",
    monthlyPrice: 199,
    annualPrice: 1999,
    features: [
      "Address capture & storage",
      "Single branch support",
      "Driver address lookup",
      "Basic QR code generation",
      "Email support"
    ],
    isDefault: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    slug: "standard",
    name: "Standard",
    monthlyPrice: 499,
    annualPrice: 4999,
    features: [
      "Everything in Basic",
      "Driver management",
      "Delivery feedback collection",
      "Basic analytics dashboard",
      "Up to 10 drivers",
      "Priority email support"
    ],
    isDefault: false,
    isActive: true,
    sortOrder: 2,
  },
  {
    slug: "pro",
    name: "Pro",
    monthlyPrice: 899,
    annualPrice: 8999,
    features: [
      "Everything in Standard",
      "Live delivery map view",
      "Credit scoring system",
      "Advanced analytics",
      "API integrations",
      "Up to 50 drivers",
      "Phone & email support"
    ],
    isDefault: false,
    isActive: true,
    sortOrder: 3,
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    monthlyPrice: 1499,
    annualPrice: 14999,
    features: [
      "Everything in Pro",
      "Unlimited drivers",
      "Multiple branch support",
      "SLA dashboard",
      "Custom billing & export",
      "Dedicated account manager",
      "24/7 priority support"
    ],
    isDefault: false,
    isActive: true,
    sortOrder: 4,
  },
];

export async function seedPricingPlans(): Promise<void> {
  try {
    for (const plan of PRICING_PLANS_SEED) {
      const existing = await db.select().from(pricingPlans).where(eq(pricingPlans.slug, plan.slug));
      
      if (existing.length === 0) {
        await db.insert(pricingPlans).values(plan);
        console.log(`Seeded pricing plan: ${plan.name}`);
      } else {
        await db.update(pricingPlans)
          .set({
            name: plan.name,
            monthlyPrice: plan.monthlyPrice,
            annualPrice: plan.annualPrice,
            features: plan.features,
            isDefault: plan.isDefault,
            isActive: plan.isActive,
            sortOrder: plan.sortOrder,
          })
          .where(eq(pricingPlans.slug, plan.slug));
      }
    }
    console.log("Pricing plans seeded successfully");
  } catch (error) {
    console.error("Error seeding pricing plans:", error);
  }
}
