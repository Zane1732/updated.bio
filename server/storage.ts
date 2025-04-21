import { users, type User, type InsertUser, requestStats, type RequestStat, type InsertRequestStat } from "@shared/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, desc } from "drizzle-orm";
import postgres from 'postgres';

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Request stats methods
  saveRequestStat(stat: InsertRequestStat): Promise<RequestStat>;
  getRecentRequestStats(limit: number): Promise<RequestStat[]>;
}

// Configure PostgreSQL client
const connectionString = process.env.DATABASE_URL;
const client = connectionString ? postgres(connectionString) : null;
const db = client ? drizzle(client) : null;

export class PostgresStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    if (!db) return undefined;
    const results = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return results[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) return undefined;
    const results = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return results[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) throw new Error("Database not connected");
    const results = await db.insert(users).values(insertUser).returning();
    return results[0];
  }
  
  async saveRequestStat(stat: InsertRequestStat): Promise<RequestStat> {
    if (!db) throw new Error("Database not connected");
    const results = await db.insert(requestStats).values(stat).returning();
    return results[0];
  }
  
  async getRecentRequestStats(limit: number): Promise<RequestStat[]> {
    if (!db) return [];
    return await db.select().from(requestStats).orderBy(desc(requestStats.timestamp)).limit(limit);
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private requestStats: RequestStat[];
  userCurrentId: number;
  statCurrentId: number;

  constructor() {
    this.users = new Map();
    this.userCurrentId = 1;
    this.requestStats = [];
    this.statCurrentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async saveRequestStat(stat: InsertRequestStat): Promise<RequestStat> {
    const id = this.statCurrentId++;
    const timestamp = new Date();
    const requestStat: RequestStat = { ...stat, id, timestamp };
    this.requestStats.push(requestStat);
    return requestStat;
  }
  
  async getRecentRequestStats(limit: number): Promise<RequestStat[]> {
    return this.requestStats
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

// Use PostgreSQL if database URL is available, otherwise fallback to in-memory storage
export const storage = connectionString ? new PostgresStorage() : new MemStorage();
