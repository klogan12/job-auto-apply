import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with profile fields for job applications.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  // Extended profile fields
  phone: varchar("phone", { length: 32 }),
  location: varchar("location", { length: 256 }),
  headline: varchar("headline", { length: 256 }),
  summary: text("summary"),
  linkedinUrl: varchar("linkedinUrl", { length: 512 }),
  portfolioUrl: varchar("portfolioUrl", { length: 512 }),
  githubUrl: varchar("githubUrl", { length: 512 }),
  skills: json("skills").$type<string[]>(),
  experience: json("experience").$type<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description?: string;
  }[]>(),
  education: json("education").$type<{
    degree: string;
    school: string;
    field?: string;
    startDate: string;
    endDate?: string;
    gpa?: string;
  }[]>(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Resumes table for storing uploaded CV/resume files
 */
export const resumes = mysqlTable("resumes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 1024 }).notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 128 }),
  fileSize: int("fileSize"),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Resume = typeof resumes.$inferSelect;
export type InsertResume = typeof resumes.$inferInsert;

/**
 * Job boards configuration (admin managed)
 */
export const jobBoards = mysqlTable("jobBoards", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  logoUrl: varchar("logoUrl", { length: 512 }),
  websiteUrl: varchar("websiteUrl", { length: 512 }),
  apiEndpoint: varchar("apiEndpoint", { length: 512 }),
  isActive: boolean("isActive").default(true),
  successRate: int("successRate").default(0),
  totalApplications: int("totalApplications").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobBoard = typeof jobBoards.$inferSelect;
export type InsertJobBoard = typeof jobBoards.$inferInsert;

/**
 * Jobs table for storing job listings
 */
export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 128 }),
  jobBoardId: int("jobBoardId"),
  title: varchar("title", { length: 256 }).notNull(),
  company: varchar("company", { length: 256 }).notNull(),
  companyLogo: varchar("companyLogo", { length: 512 }),
  location: varchar("location", { length: 256 }),
  locationType: mysqlEnum("locationType", ["remote", "hybrid", "onsite"]).default("onsite"),
  salary: varchar("salary", { length: 128 }),
  salaryMin: int("salaryMin"),
  salaryMax: int("salaryMax"),
  description: text("description"),
  requirements: json("requirements").$type<string[]>(),
  benefits: json("benefits").$type<string[]>(),
  employmentType: mysqlEnum("employmentType", ["full-time", "part-time", "contract", "internship"]).default("full-time"),
  experienceLevel: mysqlEnum("experienceLevel", ["entry", "mid", "senior", "lead", "executive"]),
  applicationUrl: varchar("applicationUrl", { length: 1024 }),
  postedAt: timestamp("postedAt"),
  expiresAt: timestamp("expiresAt"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

/**
 * Applications table for tracking job applications
 */
export const applications = mysqlTable("applications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  jobId: int("jobId").notNull(),
  resumeId: int("resumeId"),
  templateId: int("templateId"),
  status: mysqlEnum("status", ["draft", "pending", "submitted", "viewed", "interview", "offered", "rejected", "withdrawn"]).default("draft").notNull(),
  coverLetter: text("coverLetter"),
  customAnswers: json("customAnswers").$type<Record<string, string>>(),
  appliedAt: timestamp("appliedAt"),
  lastStatusUpdate: timestamp("lastStatusUpdate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Application = typeof applications.$inferSelect;
export type InsertApplication = typeof applications.$inferInsert;

/**
 * Templates for cover letters and application forms
 */
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  type: mysqlEnum("type", ["cover_letter", "application_form"]).notNull(),
  content: text("content").notNull(),
  variables: json("variables").$type<string[]>(),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;
