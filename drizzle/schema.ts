import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Job seekers - stores user preferences for auto-applying
 */
export const jobSeekers = mysqlTable("job_seekers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  // Target companies (stored as JSON array)
  targetCompanies: json("targetCompanies").$type<string[]>(),
  // Target job roles (stored as JSON array)
  targetRoles: json("targetRoles").$type<string[]>(),
  // Resume file URL (stored in S3)
  resumeUrl: text("resumeUrl"),
  resumeFileName: varchar("resumeFileName", { length: 255 }),
  // Whether auto-apply is active
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobSeeker = typeof jobSeekers.$inferSelect;
export type InsertJobSeeker = typeof jobSeekers.$inferInsert;

/**
 * Auto-applications - tracks applications made by the system
 */
export const autoApplications = mysqlTable("auto_applications", {
  id: int("id").autoincrement().primaryKey(),
  jobSeekerId: int("jobSeekerId").notNull(),
  // Job details
  company: varchar("company", { length: 255 }).notNull(),
  jobTitle: varchar("jobTitle", { length: 255 }).notNull(),
  jobUrl: text("jobUrl"),
  // Application status
  status: mysqlEnum("status", ["pending", "applied", "failed", "interview", "rejected", "offered"]).default("pending").notNull(),
  // When the application was submitted
  appliedAt: timestamp("appliedAt"),
  // Notes or error messages
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AutoApplication = typeof autoApplications.$inferSelect;
export type InsertAutoApplication = typeof autoApplications.$inferInsert;

// Keep users table for compatibility but it won't be used
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
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
