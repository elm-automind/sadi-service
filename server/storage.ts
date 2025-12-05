import { 
  type User, type InsertUser, type Address, type InsertAddress,
  type FallbackContact, type InsertFallbackContact, type PasswordResetOtp,
  type CompanyProfile, type InsertCompanyProfile,
  type CompanyAddress, type InsertCompanyAddress,
  type PricingPlan, type InsertPricingPlan,
  type CompanySubscription, type InsertCompanySubscription,
  type CompanyDriver, type InsertCompanyDriver,
  users, addresses, fallbackContacts, passwordResetOtps, companyProfiles,
  companyAddresses, pricingPlans, companySubscriptions, companyDrivers
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gt, lt, asc } from "drizzle-orm";

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

  createPasswordResetOtp(userId: number, email: string, otp: string, expiresAt: Date): Promise<PasswordResetOtp>;
  getValidOtp(email: string, otp: string): Promise<PasswordResetOtp | undefined>;
  markOtpAsUsed(otpId: number): Promise<void>;
  deleteExpiredOtps(): Promise<void>;
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
}

export const storage = new DatabaseStorage();
