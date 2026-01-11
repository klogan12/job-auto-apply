import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  jobSeekers, InsertJobSeeker, JobSeeker,
  autoApplications, InsertAutoApplication, AutoApplication
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ USER QUERIES (kept for compatibility) ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ JOB SEEKER QUERIES ============

export async function createJobSeeker(data: InsertJobSeeker): Promise<JobSeeker> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(jobSeekers).values(data).$returningId();
  const seeker = await db.select().from(jobSeekers).where(eq(jobSeekers.id, result.id)).limit(1);
  return seeker[0];
}

export async function getJobSeekerByEmail(email: string): Promise<JobSeeker | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(jobSeekers).where(eq(jobSeekers.email, email)).limit(1);
  return result[0];
}

export async function getJobSeekerById(id: number): Promise<JobSeeker | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(jobSeekers).where(eq(jobSeekers.id, id)).limit(1);
  return result[0];
}

export async function updateJobSeeker(id: number, data: Partial<InsertJobSeeker>): Promise<JobSeeker | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  await db.update(jobSeekers).set({ ...data, updatedAt: new Date() }).where(eq(jobSeekers.id, id));
  return getJobSeekerById(id);
}

export async function upsertJobSeeker(data: InsertJobSeeker): Promise<JobSeeker> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if exists by email
  const existing = await getJobSeekerByEmail(data.email);
  if (existing) {
    await db.update(jobSeekers).set({ ...data, updatedAt: new Date() }).where(eq(jobSeekers.id, existing.id));
    return (await getJobSeekerById(existing.id))!;
  }
  
  return createJobSeeker(data);
}

export async function getAllJobSeekers(): Promise<JobSeeker[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(jobSeekers).orderBy(desc(jobSeekers.createdAt));
}

// ============ AUTO APPLICATION QUERIES ============

export async function createAutoApplication(data: InsertAutoApplication): Promise<AutoApplication> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(autoApplications).values(data).$returningId();
  const app = await db.select().from(autoApplications).where(eq(autoApplications.id, result.id)).limit(1);
  return app[0];
}

export async function getApplicationsByJobSeekerId(jobSeekerId: number): Promise<AutoApplication[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(autoApplications)
    .where(eq(autoApplications.jobSeekerId, jobSeekerId))
    .orderBy(desc(autoApplications.createdAt));
}

export async function updateAutoApplication(id: number, data: Partial<InsertAutoApplication>): Promise<AutoApplication | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  await db.update(autoApplications).set({ ...data, updatedAt: new Date() }).where(eq(autoApplications.id, id));
  const result = await db.select().from(autoApplications).where(eq(autoApplications.id, id)).limit(1);
  return result[0];
}

export async function getApplicationStats(jobSeekerId: number) {
  const db = await getDb();
  if (!db) return { total: 0, applied: 0, pending: 0, interviews: 0, offers: 0 };
  
  const apps = await db.select().from(autoApplications).where(eq(autoApplications.jobSeekerId, jobSeekerId));
  
  return {
    total: apps.length,
    applied: apps.filter(a => a.status === "applied").length,
    pending: apps.filter(a => a.status === "pending").length,
    interviews: apps.filter(a => a.status === "interview").length,
    offers: apps.filter(a => a.status === "offered").length,
  };
}

export async function getAllApplications(): Promise<AutoApplication[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(autoApplications).orderBy(desc(autoApplications.createdAt));
}
