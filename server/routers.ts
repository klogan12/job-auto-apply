import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Job Seeker routes
  jobSeeker: router({
    // Get job seeker by email
    getByEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        return db.getJobSeekerByEmail(input.email);
      }),

    // Create or update job seeker profile
    upsert: publicProcedure
      .input(z.object({
        email: z.string().email(),
        name: z.string().optional(),
        phone: z.string().optional(),
        targetCompanies: z.array(z.string()).default([]),
        targetRoles: z.array(z.string()).default([]),
        isActive: z.boolean().default(true),
      }))
      .mutation(async ({ input }) => {
        const seeker = await db.upsertJobSeeker({
          email: input.email,
          name: input.name,
          phone: input.phone,
          targetCompanies: input.targetCompanies,
          targetRoles: input.targetRoles,
          isActive: input.isActive,
        });
        return seeker;
      }),

    // Upload resume
    uploadResume: publicProcedure
      .input(z.object({
        email: z.string().email(),
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded
        mimeType: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Get or create job seeker
        let seeker = await db.getJobSeekerByEmail(input.email);
        if (!seeker) {
          seeker = await db.createJobSeeker({ email: input.email });
        }

        // Upload to S3
        const fileBuffer = Buffer.from(input.fileData, "base64");
        const fileKey = `resumes/${seeker.id}-${nanoid()}-${input.fileName}`;
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

        // Update job seeker with resume URL
        await db.updateJobSeeker(seeker.id, {
          resumeUrl: url,
          resumeFileName: input.fileName,
        });

        return { success: true, url };
      }),

    // Get applications for a job seeker
    getApplications: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const seeker = await db.getJobSeekerByEmail(input.email);
        if (!seeker) return [];
        return db.getApplicationsByJobSeekerId(seeker.id);
      }),

    // Get application stats
    getStats: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const seeker = await db.getJobSeekerByEmail(input.email);
        if (!seeker) return { total: 0, applied: 0, pending: 0, interviews: 0, offers: 0 };
        return db.getApplicationStats(seeker.id);
      }),

    // Toggle auto-apply status
    toggleActive: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const seeker = await db.getJobSeekerByEmail(input.email);
        if (!seeker) throw new Error("Job seeker not found");
        
        await db.updateJobSeeker(seeker.id, { isActive: !seeker.isActive });
        return { success: true, isActive: !seeker.isActive };
      }),
  }),

  // Auto Application routes (for demo/testing)
  applications: router({
    // Create a mock application (for demo purposes)
    createMock: publicProcedure
      .input(z.object({
        email: z.string().email(),
        company: z.string(),
        jobTitle: z.string(),
        jobUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const seeker = await db.getJobSeekerByEmail(input.email);
        if (!seeker) throw new Error("Job seeker not found");

        const app = await db.createAutoApplication({
          jobSeekerId: seeker.id,
          company: input.company,
          jobTitle: input.jobTitle,
          jobUrl: input.jobUrl,
          status: "applied",
          appliedAt: new Date(),
        });
        return app;
      }),

    // Update application status
    updateStatus: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "applied", "failed", "interview", "rejected", "offered"]),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.updateAutoApplication(input.id, {
          status: input.status,
          notes: input.notes,
        });
      }),

    // Get all applications (admin view)
    getAll: publicProcedure.query(async () => {
      return db.getAllApplications();
    }),
  }),
});

export type AppRouter = typeof appRouter;
