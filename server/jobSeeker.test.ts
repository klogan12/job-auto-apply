import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getJobSeekerByEmail: vi.fn(),
  upsertJobSeeker: vi.fn(),
  createJobSeeker: vi.fn(),
  updateJobSeeker: vi.fn(),
  getApplicationsByJobSeekerId: vi.fn(),
  getApplicationStats: vi.fn(),
}));

// Mock the storage module
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://s3.example.com/resume.pdf" }),
}));

import * as db from "./db";

function createContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("JobSeeker Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("jobSeeker.getByEmail", () => {
    it("returns null when job seeker not found", async () => {
      vi.mocked(db.getJobSeekerByEmail).mockResolvedValue(undefined);
      
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.jobSeeker.getByEmail({ email: "test@example.com" });
      
      expect(result).toBeUndefined();
      expect(db.getJobSeekerByEmail).toHaveBeenCalledWith("test@example.com");
    });

    it("returns job seeker when found", async () => {
      const mockSeeker = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        phone: null,
        targetCompanies: ["Google", "Microsoft"],
        targetRoles: ["Software Engineer"],
        resumeUrl: null,
        resumeFileName: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(db.getJobSeekerByEmail).mockResolvedValue(mockSeeker);
      
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.jobSeeker.getByEmail({ email: "test@example.com" });
      
      expect(result).toEqual(mockSeeker);
    });
  });

  describe("jobSeeker.upsert", () => {
    it("creates or updates a job seeker profile", async () => {
      const mockSeeker = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        phone: "+1234567890",
        targetCompanies: ["Google", "Apple"],
        targetRoles: ["Product Manager"],
        resumeUrl: null,
        resumeFileName: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(db.upsertJobSeeker).mockResolvedValue(mockSeeker);
      
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.jobSeeker.upsert({
        email: "test@example.com",
        name: "Test User",
        phone: "+1234567890",
        targetCompanies: ["Google", "Apple"],
        targetRoles: ["Product Manager"],
        isActive: true,
      });
      
      expect(result).toEqual(mockSeeker);
      expect(db.upsertJobSeeker).toHaveBeenCalledWith({
        email: "test@example.com",
        name: "Test User",
        phone: "+1234567890",
        targetCompanies: ["Google", "Apple"],
        targetRoles: ["Product Manager"],
        isActive: true,
      });
    });
  });

  describe("jobSeeker.getApplications", () => {
    it("returns empty array when job seeker not found", async () => {
      vi.mocked(db.getJobSeekerByEmail).mockResolvedValue(undefined);
      
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.jobSeeker.getApplications({ email: "test@example.com" });
      
      expect(result).toEqual([]);
    });

    it("returns applications for existing job seeker", async () => {
      const mockSeeker = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        phone: null,
        targetCompanies: [],
        targetRoles: [],
        resumeUrl: null,
        resumeFileName: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockApplications = [
        {
          id: 1,
          jobSeekerId: 1,
          company: "Google",
          jobTitle: "Software Engineer",
          jobUrl: "https://google.com/jobs/1",
          status: "applied" as const,
          appliedAt: new Date(),
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      vi.mocked(db.getJobSeekerByEmail).mockResolvedValue(mockSeeker);
      vi.mocked(db.getApplicationsByJobSeekerId).mockResolvedValue(mockApplications);
      
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.jobSeeker.getApplications({ email: "test@example.com" });
      
      expect(result).toEqual(mockApplications);
      expect(db.getApplicationsByJobSeekerId).toHaveBeenCalledWith(1);
    });
  });

  describe("jobSeeker.getStats", () => {
    it("returns zero stats when job seeker not found", async () => {
      vi.mocked(db.getJobSeekerByEmail).mockResolvedValue(undefined);
      
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.jobSeeker.getStats({ email: "test@example.com" });
      
      expect(result).toEqual({ total: 0, applied: 0, pending: 0, interviews: 0, offers: 0 });
    });

    it("returns stats for existing job seeker", async () => {
      const mockSeeker = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        phone: null,
        targetCompanies: [],
        targetRoles: [],
        resumeUrl: null,
        resumeFileName: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockStats = { total: 10, applied: 8, pending: 1, interviews: 2, offers: 1 };
      vi.mocked(db.getJobSeekerByEmail).mockResolvedValue(mockSeeker);
      vi.mocked(db.getApplicationStats).mockResolvedValue(mockStats);
      
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.jobSeeker.getStats({ email: "test@example.com" });
      
      expect(result).toEqual(mockStats);
    });
  });

  describe("jobSeeker.toggleActive", () => {
    it("throws error when job seeker not found", async () => {
      vi.mocked(db.getJobSeekerByEmail).mockResolvedValue(undefined);
      
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.jobSeeker.toggleActive({ email: "test@example.com" }))
        .rejects.toThrow("Job seeker not found");
    });

    it("toggles active status from true to false", async () => {
      const mockSeeker = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        phone: null,
        targetCompanies: [],
        targetRoles: [],
        resumeUrl: null,
        resumeFileName: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(db.getJobSeekerByEmail).mockResolvedValue(mockSeeker);
      vi.mocked(db.updateJobSeeker).mockResolvedValue({ ...mockSeeker, isActive: false });
      
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);
      
      const result = await caller.jobSeeker.toggleActive({ email: "test@example.com" });
      
      expect(result).toEqual({ success: true, isActive: false });
      expect(db.updateJobSeeker).toHaveBeenCalledWith(1, { isActive: false });
    });
  });
});
