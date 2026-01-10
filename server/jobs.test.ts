import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  getJobs: vi.fn().mockResolvedValue({ jobs: [], total: 0 }),
  getJobById: vi.fn().mockResolvedValue(null),
  createJob: vi.fn().mockResolvedValue({ id: 1 }),
  getUserById: vi.fn().mockResolvedValue(null),
  updateUserProfile: vi.fn().mockResolvedValue(undefined),
  getResumesByUserId: vi.fn().mockResolvedValue([]),
  createResume: vi.fn().mockResolvedValue({ id: 1 }),
  deleteResume: vi.fn().mockResolvedValue(true),
  setDefaultResume: vi.fn().mockResolvedValue(undefined),
  getResumeById: vi.fn().mockResolvedValue(null),
  getApplicationsByUserId: vi.fn().mockResolvedValue([]),
  getApplicationStats: vi.fn().mockResolvedValue({
    total: 0,
    submitted: 0,
    interviews: 0,
    offers: 0,
  }),
  createApplication: vi.fn().mockResolvedValue({ id: 1 }),
  updateApplication: vi.fn().mockResolvedValue(undefined),
  submitApplication: vi.fn().mockResolvedValue(undefined),
  getTemplatesByUserId: vi.fn().mockResolvedValue([]),
  createTemplate: vi.fn().mockResolvedValue({ id: 1 }),
  updateTemplate: vi.fn().mockResolvedValue(undefined),
  deleteTemplate: vi.fn().mockResolvedValue(true),
  getAllJobBoards: vi.fn().mockResolvedValue([]),
  createJobBoard: vi.fn().mockResolvedValue({ id: 1 }),
  updateJobBoard: vi.fn().mockResolvedValue(undefined),
  deleteJobBoard: vi.fn().mockResolvedValue(true),
  getAdminStats: vi.fn().mockResolvedValue({
    totalUsers: 0,
    totalJobs: 0,
    totalApplications: 0,
    avgSuccessRate: 0,
  }),
  bulkCreateJobs: vi.fn().mockResolvedValue(undefined),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
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

describe("Jobs Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("jobs.list", () => {
    it("returns empty list when no jobs exist", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.jobs.list({});

      expect(result).toEqual({ jobs: [], total: 0 });
    });

    it("accepts filter parameters", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.jobs.list({
        search: "software engineer",
        location: "San Francisco",
        locationType: "remote",
        employmentType: "full-time",
        experienceLevel: "senior",
        limit: 20,
        offset: 0,
      });

      expect(result).toBeDefined();
      expect(result.jobs).toBeInstanceOf(Array);
    });
  });

  describe("jobs.get", () => {
    it("throws NOT_FOUND for non-existent job", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.jobs.get({ id: 999 })).rejects.toThrow("Job not found");
    });
  });
});

describe("Profile Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("profile.get", () => {
    it("returns null for user without profile", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.profile.get();

      expect(result).toBeNull();
    });
  });

  describe("profile.update", () => {
    it("updates user profile without error", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      // Should not throw
      await expect(caller.profile.update({
        name: "John Doe",
        phone: "+1234567890",
        location: "San Francisco, CA",
        headline: "Senior Software Engineer",
        summary: "Experienced developer",
        skills: ["JavaScript", "TypeScript", "React"],
      })).resolves.not.toThrow();
    });
  });
});

describe("Resume Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resume.list", () => {
    it("returns empty list for user without resumes", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.resume.list();

      expect(result).toEqual([]);
    });
  });

  describe("resume.upload", () => {
    it("uploads resume successfully", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.resume.upload({
        name: "My Resume.pdf",
        fileData: "base64encodeddata",
        mimeType: "application/pdf",
        fileSize: 1024,
        isDefault: true,
      });

      expect(result).toHaveProperty("id");
    });
  });
});

describe("Applications Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("applications.list", () => {
    it("returns empty list for user without applications", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.applications.list();

      expect(result).toEqual([]);
    });
  });

  describe("applications.stats", () => {
    it("returns zero stats for new user", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.applications.stats();

      expect(result).toEqual({
        total: 0,
        submitted: 0,
        interviews: 0,
        offers: 0,
      });
    });
  });

  describe("applications.create", () => {
    it("creates application successfully", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.applications.create({
        jobId: 1,
        resumeId: 1,
        coverLetter: "I am excited to apply...",
      });

      expect(result).toHaveProperty("id");
    });
  });
});

describe("Templates Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("templates.list", () => {
    it("returns empty list for user without templates", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.templates.list({ type: "cover_letter" });

      expect(result).toEqual([]);
    });
  });

  describe("templates.create", () => {
    it("creates template successfully", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.templates.create({
        name: "My Cover Letter",
        type: "cover_letter",
        content: "Dear {{company}}, I am applying for {{position}}...",
        variables: ["company", "position"],
        isDefault: true,
      });

      expect(result).toHaveProperty("id");
    });
  });
});

describe("Admin Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("admin.stats", () => {
    it("returns stats for admin user", async () => {
      const ctx = createMockContext("admin");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.stats();

      expect(result).toEqual({
        totalUsers: 0,
        totalJobs: 0,
        totalApplications: 0,
        avgSuccessRate: 0,
      });
    });

    it("throws error for non-admin user", async () => {
      const ctx = createMockContext("user");
      const caller = appRouter.createCaller(ctx);

      await expect(caller.admin.stats()).rejects.toThrow();
    });
  });

  describe("admin.jobBoards.list", () => {
    it("returns job boards for admin", async () => {
      const ctx = createMockContext("admin");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.jobBoards.list();

      expect(result).toEqual([]);
    });
  });

  describe("admin.seedJobs", () => {
    it("seeds sample jobs for admin", async () => {
      const ctx = createMockContext("admin");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.seedJobs();

      expect(result.success).toBe(true);
      expect(result.count).toBeGreaterThan(0);
    });
  });
});

describe("Auth Router", () => {
  describe("auth.me", () => {
    it("returns user when authenticated", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result).toBeDefined();
      expect(result?.email).toBe("test@example.com");
    });

    it("returns null when not authenticated", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.me();

      expect(result).toBeNull();
    });
  });

  describe("auth.logout", () => {
    it("clears session cookie on logout", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.logout();

      expect(result).toEqual({ success: true });
      expect(ctx.res.clearCookie).toHaveBeenCalled();
    });
  });
});
