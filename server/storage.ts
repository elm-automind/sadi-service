import { type User, type InsertUser, type Address, type InsertAddress, users, addresses } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByIqama(iqamaId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createAddress(address: InsertAddress): Promise<Address>;
  getAddressesByUserId(userId: number): Promise<Address[]>;
  getAddressByDigitalId(digitalId: string): Promise<Address | undefined>;
  updateAddress(id: number, address: Partial<Address>): Promise<Address | undefined>;
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

  async createAddress(insertAddress: InsertAddress): Promise<Address> {
    const [address] = await db
      .insert(addresses)
      .values(insertAddress)
      .returning();
    return address;
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
}

export const storage = new DatabaseStorage();
