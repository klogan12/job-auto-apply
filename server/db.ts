import { eq, and, desc, like, or, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  resumes, InsertResume, Resume,
  jobs, InsertJob, Job,
  applications, InsertApplication, Application,
  templates, InsertTemplate, Template,
  jobBoards, InsertJobBoard, JobBoard
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

// ============ USER QUERIES ============

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

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(userId: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
  return getUserById(userId);
}

// ============ RESUME QUERIES ============

export async function createResume(data: InsertResume): Promise<Resume> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // If this is set as default, unset other defaults first
  if (data.isDefault) {
    await db.update(resumes).set({ isDefault: false }).where(eq(resumes.userId, data.userId));
  }
  
  const [result] = await db.insert(resumes).values(data).$returningId();
  const resume = await db.select().from(resumes).where(eq(resumes.id, result.id)).limit(1);
  return resume[0];
}

export async function getResumesByUserId(userId: number): Promise<Resume[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(resumes).where(eq(resumes.userId, userId)).orderBy(desc(resumes.createdAt));
}

export async function getResumeById(id: number): Promise<Resume | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1);
  return result[0];
}

export async function deleteResume(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.delete(resumes).where(and(eq(resumes.id, id), eq(resumes.userId, userId)));
  return true;
}

export async function setDefaultResume(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(resumes).set({ isDefault: false }).where(eq(resumes.userId, userId));
  await db.update(resumes).set({ isDefault: true }).where(and(eq(resumes.id, id), eq(resumes.userId, userId)));
}

// ============ JOB QUERIES ============

export async function createJob(data: InsertJob): Promise<Job> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(jobs).values(data).$returningId();
  const job = await db.select().from(jobs).where(eq(jobs.id, result.id)).limit(1);
  return job[0];
}

export async function getJobs(filters?: {
  search?: string;
  location?: string;
  locationType?: string;
  employmentType?: string;
  experienceLevel?: string;
  salaryMin?: number;
  salaryMax?: number;
  limit?: number;
  offset?: number;
}): Promise<{ jobs: Job[]; total: number }> {
  const db = await getDb();
  if (!db) return { jobs: [], total: 0 };

  const conditions = [eq(jobs.isActive, true)];

  if (filters?.search) {
    conditions.push(
      or(
        like(jobs.title, `%${filters.search}%`),
        like(jobs.company, `%${filters.search}%`),
        like(jobs.description, `%${filters.search}%`)
      )!
    );
  }

  if (filters?.location) {
    conditions.push(like(jobs.location, `%${filters.location}%`));
  }

  if (filters?.locationType) {
    conditions.push(eq(jobs.locationType, filters.locationType as any));
  }

  if (filters?.employmentType) {
    conditions.push(eq(jobs.employmentType, filters.employmentType as any));
  }

  if (filters?.experienceLevel) {
    conditions.push(eq(jobs.experienceLevel, filters.experienceLevel as any));
  }

  if (filters?.salaryMin) {
    conditions.push(sql`${jobs.salaryMin} >= ${filters.salaryMin}`);
  }

  if (filters?.salaryMax) {
    conditions.push(sql`${jobs.salaryMax} <= ${filters.salaryMax}`);
  }

  const whereClause = and(...conditions);
  
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(jobs).where(whereClause);
  const total = Number(countResult?.count ?? 0);

  const limit = filters?.limit ?? 20;
  const offset = filters?.offset ?? 0;

  const jobList = await db
    .select()
    .from(jobs)
    .where(whereClause)
    .orderBy(desc(jobs.postedAt))
    .limit(limit)
    .offset(offset);

  return { jobs: jobList, total };
}

export async function getJobById(id: number): Promise<Job | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result[0];
}

export async function bulkCreateJobs(jobsData: InsertJob[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (jobsData.length === 0) return;
  await db.insert(jobs).values(jobsData);
}

// ============ APPLICATION QUERIES ============

export async function createApplication(data: InsertApplication): Promise<Application> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(applications).values(data).$returningId();
  const app = await db.select().from(applications).where(eq(applications.id, result.id)).limit(1);
  return app[0];
}

export async function getApplicationsByUserId(userId: number): Promise<(Application & { job?: Job })[]> {
  const db = await getDb();
  if (!db) return [];
  
  const apps = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.createdAt));

  // Get associated jobs
  const jobIds = apps.map(a => a.jobId).filter(Boolean);
  if (jobIds.length === 0) return apps;

  const jobList = await db.select().from(jobs).where(inArray(jobs.id, jobIds));
  const jobMap = new Map(jobList.map(j => [j.id, j]));

  return apps.map(app => ({
    ...app,
    job: jobMap.get(app.jobId)
  }));
}

export async function getApplicationById(id: number): Promise<Application | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  return result[0];
}

export async function updateApplication(id: number, userId: number, data: Partial<InsertApplication>): Promise<Application | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(applications).set({ ...data, updatedAt: new Date() }).where(and(eq(applications.id, id), eq(applications.userId, userId)));
  return getApplicationById(id);
}

export async function submitApplication(id: number, userId: number): Promise<Application | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  await db.update(applications).set({ 
    status: "submitted", 
    appliedAt: now,
    lastStatusUpdate: now,
    updatedAt: now 
  }).where(and(eq(applications.id, id), eq(applications.userId, userId)));
  return getApplicationById(id);
}

export async function getApplicationStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, submitted: 0, interviews: 0, offers: 0, rejected: 0 };

  const apps = await db.select().from(applications).where(eq(applications.userId, userId));
  
  return {
    total: apps.length,
    submitted: apps.filter(a => a.status === "submitted").length,
    interviews: apps.filter(a => a.status === "interview").length,
    offers: apps.filter(a => a.status === "offered").length,
    rejected: apps.filter(a => a.status === "rejected").length,
    pending: apps.filter(a => a.status === "pending").length,
    draft: apps.filter(a => a.status === "draft").length,
  };
}

// ============ TEMPLATE QUERIES ============

export async function createTemplate(data: InsertTemplate): Promise<Template> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (data.isDefault) {
    await db.update(templates).set({ isDefault: false }).where(and(eq(templates.userId, data.userId), eq(templates.type, data.type)));
  }
  
  const [result] = await db.insert(templates).values(data).$returningId();
  const template = await db.select().from(templates).where(eq(templates.id, result.id)).limit(1);
  return template[0];
}

export async function getTemplatesByUserId(userId: number, type?: string): Promise<Template[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(templates.userId, userId)];
  if (type) {
    conditions.push(eq(templates.type, type as any));
  }
  
  return db.select().from(templates).where(and(...conditions)).orderBy(desc(templates.createdAt));
}

export async function getTemplateById(id: number): Promise<Template | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  return result[0];
}

export async function updateTemplate(id: number, userId: number, data: Partial<InsertTemplate>): Promise<Template | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(templates).set({ ...data, updatedAt: new Date() }).where(and(eq(templates.id, id), eq(templates.userId, userId)));
  return getTemplateById(id);
}

export async function deleteTemplate(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.delete(templates).where(and(eq(templates.id, id), eq(templates.userId, userId)));
  return true;
}

// ============ JOB BOARD QUERIES (ADMIN) ============

export async function createJobBoard(data: InsertJobBoard): Promise<JobBoard> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(jobBoards).values(data).$returningId();
  const board = await db.select().from(jobBoards).where(eq(jobBoards.id, result.id)).limit(1);
  return board[0];
}

export async function getAllJobBoards(): Promise<JobBoard[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobBoards).orderBy(desc(jobBoards.createdAt));
}

export async function getActiveJobBoards(): Promise<JobBoard[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobBoards).where(eq(jobBoards.isActive, true)).orderBy(jobBoards.name);
}

export async function updateJobBoard(id: number, data: Partial<InsertJobBoard>): Promise<JobBoard | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(jobBoards).set({ ...data, updatedAt: new Date() }).where(eq(jobBoards.id, id));
  const result = await db.select().from(jobBoards).where(eq(jobBoards.id, id)).limit(1);
  return result[0];
}

export async function deleteJobBoard(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.delete(jobBoards).where(eq(jobBoards.id, id));
  return true;
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { totalUsers: 0, totalApplications: 0, totalJobs: 0, avgSuccessRate: 0 };

  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [appCount] = await db.select({ count: sql<number>`count(*)` }).from(applications);
  const [jobCount] = await db.select({ count: sql<number>`count(*)` }).from(jobs);
  const boards = await db.select().from(jobBoards);
  
  const avgSuccessRate = boards.length > 0 
    ? boards.reduce((sum, b) => sum + (b.successRate ?? 0), 0) / boards.length 
    : 0;

  return {
    totalUsers: Number(userCount?.count ?? 0),
    totalApplications: Number(appCount?.count ?? 0),
    totalJobs: Number(jobCount?.count ?? 0),
    avgSuccessRate: Math.round(avgSuccessRate),
  };
}
