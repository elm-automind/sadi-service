import { type User, type InsertUser, type Address, type InsertAddress } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByIqama(iqamaId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createAddress(address: InsertAddress): Promise<Address>;
  getAddressesByUserId(userId: number): Promise<Address[]>;
  updateAddress(id: number, address: Partial<Address>): Promise<Address | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private addresses: Map<number, Address>;
  private userIdCounter = 1;
  private addressIdCounter = 1;

  constructor() {
    this.users = new Map();
    this.addresses = new Map();
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByIqama(iqamaId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.iqamaId === iqamaId);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.phone === phone);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async createAddress(insertAddress: InsertAddress): Promise<Address> {
    const id = this.addressIdCounter++;
    const address: Address = { 
      ...insertAddress, 
      id, 
      createdAt: new Date(),
      // Default values for optional fields if missing
      lat: insertAddress.lat ?? 0,
      lng: insertAddress.lng ?? 0,
      photoBuilding: insertAddress.photoBuilding ?? null,
      photoGate: insertAddress.photoGate ?? null,
      photoDoor: insertAddress.photoDoor ?? null,
      preferredTime: insertAddress.preferredTime ?? "morning",
      specialNote: insertAddress.specialNote ?? null,
      fallbackOption: insertAddress.fallbackOption ?? "door"
    };
    this.addresses.set(id, address);
    return address;
  }

  async getAddressesByUserId(userId: number): Promise<Address[]> {
    return Array.from(this.addresses.values()).filter(a => a.userId === userId);
  }

  async updateAddress(id: number, updates: Partial<Address>): Promise<Address | undefined> {
    const existing = this.addresses.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.addresses.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
