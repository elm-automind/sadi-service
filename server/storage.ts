import { 
  type User, type InsertUser, type Address, type InsertAddress,
  type FallbackContact, type InsertFallbackContact, type PasswordResetOtp,
  type CompanyProfile, type InsertCompanyProfile,
  users, addresses, fallbackContacts, passwordResetOtps, companyProfiles
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gt, lt } from "drizzle-orm";

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
  
  createAddress(address: InsertAddress): Promise<Address>;
  getAddressById(id: number): Promise<Address | undefined>;
  getAddressesByUserId(userId: number): Promise<Address[]>;
  getAddressByDigitalId(digitalId: string): Promise<Address | undefined>;
  updateAddress(id: number, address: Partial<Address>): Promise<Address | undefined>;

  createFallbackContact(contact: InsertFallbackContact): Promise<FallbackContact>;
  getFallbackContactsByAddressId(addressId: number): Promise<FallbackContact[]>;
  getFallbackContactById(id: number): Promise<FallbackContact | undefined>;
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
