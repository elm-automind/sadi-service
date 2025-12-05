import { 
  type User, type InsertUser, type Address, type InsertAddress,
  type FallbackContact, type InsertFallbackContact, type PasswordResetToken,
  users, addresses, fallbackContacts, passwordResetTokens 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gt, lt } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByIqama(iqamaId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  
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

  createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getValidPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markTokenAsUsed(tokenId: number): Promise<void>;
  deleteExpiredTokens(): Promise<void>;
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

  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values({ userId, token, expiresAt })
      .returning();
    return resetToken;
  }

  async getValidPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const now = new Date();
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false),
          gt(passwordResetTokens.expiresAt, now)
        )
      );
    return resetToken || undefined;
  }

  async markTokenAsUsed(tokenId: number): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, tokenId));
  }

  async deleteExpiredTokens(): Promise<void> {
    const now = new Date();
    await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, now));
  }
}

export const storage = new DatabaseStorage();
