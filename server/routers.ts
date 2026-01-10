import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { invokeLLM } from "./_core/llm";

// Admin procedure - requires admin role
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

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

  // User Profile Management
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserById(ctx.user.id);
    }),

    update: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        location: z.string().optional(),
        headline: z.string().optional(),
        summary: z.string().optional(),
        linkedinUrl: z.string().optional(),
        portfolioUrl: z.string().optional(),
        githubUrl: z.string().optional(),
        skills: z.array(z.string()).optional(),
        experience: z.array(z.object({
          title: z.string(),
          company: z.string(),
          location: z.string().optional(),
          startDate: z.string(),
          endDate: z.string().optional(),
          current: z.boolean(),
          description: z.string().optional(),
        })).optional(),
        education: z.array(z.object({
          degree: z.string(),
          school: z.string(),
          field: z.string().optional(),
          startDate: z.string(),
          endDate: z.string().optional(),
          gpa: z.string().optional(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.updateUserProfile(ctx.user.id, input);
      }),
  }),

  // Resume Management
  resume: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getResumesByUserId(ctx.user.id);
    }),

    upload: protectedProcedure
      .input(z.object({
        name: z.string(),
        fileData: z.string(), // base64 encoded
        mimeType: z.string(),
        fileSize: z.number(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.fileData, "base64");
        const ext = input.mimeType === "application/pdf" ? "pdf" : "doc";
        const fileKey = `resumes/${ctx.user.id}/${nanoid()}.${ext}`;
        
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        return db.createResume({
          userId: ctx.user.id,
          name: input.name,
          fileUrl: url,
          fileKey,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          isDefault: input.isDefault ?? false,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.deleteResume(input.id, ctx.user.id);
      }),

    setDefault: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.setDefaultResume(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Job Search and Listing
  jobs: router({
    list: publicProcedure
      .input(z.object({
        search: z.string().optional(),
        location: z.string().optional(),
        locationType: z.enum(["remote", "hybrid", "onsite"]).optional(),
        employmentType: z.enum(["full-time", "part-time", "contract", "internship"]).optional(),
        experienceLevel: z.enum(["entry", "mid", "senior", "lead", "executive"]).optional(),
        salaryMin: z.number().optional(),
        salaryMax: z.number().optional(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getJobs(input ?? {});
      }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const job = await db.getJobById(input.id);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }
        return job;
      }),
  }),

  // Application Management
  applications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getApplicationsByUserId(ctx.user.id);
    }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getApplicationStats(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const app = await db.getApplicationById(input.id);
        if (!app || app.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        return app;
      }),

    create: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        resumeId: z.number().optional(),
        templateId: z.number().optional(),
        coverLetter: z.string().optional(),
        customAnswers: z.record(z.string(), z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if already applied
        const existing = await db.getApplicationsByUserId(ctx.user.id);
        if (existing.some(a => a.jobId === input.jobId)) {
          throw new TRPCError({ code: "CONFLICT", message: "Already applied to this job" });
        }
        
        return db.createApplication({
          userId: ctx.user.id,
          ...input,
          status: "draft",
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        coverLetter: z.string().optional(),
        customAnswers: z.record(z.string(), z.string()).optional(),
        notes: z.string().optional(),
        resumeId: z.number().optional(),
        templateId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateApplication(id, ctx.user.id, data);
      }),

    submit: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const app = await db.getApplicationById(input.id);
        if (!app || app.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        if (app.status !== "draft" && app.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Application already submitted" });
        }
        return db.submitApplication(input.id, ctx.user.id);
      }),

    withdraw: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.updateApplication(input.id, ctx.user.id, { status: "withdrawn" });
      }),

    // Auto-apply to multiple jobs
    autoApply: protectedProcedure
      .input(z.object({
        jobIds: z.array(z.number()),
        resumeId: z.number(),
        templateId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const results: { jobId: number; success: boolean; error?: string }[] = [];
        
        for (const jobId of input.jobIds) {
          try {
            // Check if already applied
            const existing = await db.getApplicationsByUserId(ctx.user.id);
            if (existing.some(a => a.jobId === jobId)) {
              results.push({ jobId, success: false, error: "Already applied" });
              continue;
            }

            // Get job details for cover letter generation
            const job = await db.getJobById(jobId);
            if (!job) {
              results.push({ jobId, success: false, error: "Job not found" });
              continue;
            }

            // Get user profile for personalization
            const user = await db.getUserById(ctx.user.id);
            
            // Generate cover letter if template provided
            let coverLetter = "";
            if (input.templateId) {
              const template = await db.getTemplateById(input.templateId);
              if (template) {
                coverLetter = template.content
                  .replace(/\{\{name\}\}/g, user?.name ?? "")
                  .replace(/\{\{company\}\}/g, job.company)
                  .replace(/\{\{position\}\}/g, job.title)
                  .replace(/\{\{skills\}\}/g, (user?.skills ?? []).join(", "));
              }
            }

            // Create and submit application
            const app = await db.createApplication({
              userId: ctx.user.id,
              jobId,
              resumeId: input.resumeId,
              templateId: input.templateId,
              coverLetter,
              status: "pending",
            });

            await db.submitApplication(app.id, ctx.user.id);
            results.push({ jobId, success: true });
          } catch (error) {
            results.push({ jobId, success: false, error: String(error) });
          }
        }

        return results;
      }),
  }),

  // Template Management
  templates: router({
    list: protectedProcedure
      .input(z.object({
        type: z.enum(["cover_letter", "application_form"]).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return db.getTemplatesByUserId(ctx.user.id, input?.type);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const template = await db.getTemplateById(input.id);
        if (!template || template.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
        }
        return template;
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        type: z.enum(["cover_letter", "application_form"]),
        content: z.string(),
        variables: z.array(z.string()).optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createTemplate({
          userId: ctx.user.id,
          ...input,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        content: z.string().optional(),
        variables: z.array(z.string()).optional(),
        isDefault: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateTemplate(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        return db.deleteTemplate(input.id, ctx.user.id);
      }),

    // Generate cover letter using AI
    generateCoverLetter: protectedProcedure
      .input(z.object({
        jobId: z.number(),
        tone: z.enum(["professional", "friendly", "enthusiastic"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const job = await db.getJobById(input.jobId);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }

        const user = await db.getUserById(ctx.user.id);
        
        const prompt = `Generate a professional cover letter for the following job application:

Job Title: ${job.title}
Company: ${job.company}
Job Description: ${job.description ?? "Not provided"}

Applicant Information:
Name: ${user?.name ?? "Applicant"}
Skills: ${(user?.skills ?? []).join(", ") || "Not specified"}
Experience: ${JSON.stringify(user?.experience ?? [])}
Summary: ${user?.summary ?? "Not provided"}

Tone: ${input.tone ?? "professional"}

Please write a compelling cover letter that highlights relevant experience and enthusiasm for the role. Keep it concise (3-4 paragraphs).`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional career coach helping write compelling cover letters." },
            { role: "user", content: prompt },
          ],
        });

        return {
          content: response.choices[0]?.message?.content ?? "",
        };
      }),
  }),

  // Admin Panel
  admin: router({
    stats: adminProcedure.query(async () => {
      return db.getAdminStats();
    }),

    jobBoards: router({
      list: adminProcedure.query(async () => {
        return db.getAllJobBoards();
      }),

      create: adminProcedure
        .input(z.object({
          name: z.string(),
          slug: z.string(),
          logoUrl: z.string().optional(),
          websiteUrl: z.string().optional(),
          apiEndpoint: z.string().optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
          return db.createJobBoard(input);
        }),

      update: adminProcedure
        .input(z.object({
          id: z.number(),
          name: z.string().optional(),
          logoUrl: z.string().optional(),
          websiteUrl: z.string().optional(),
          apiEndpoint: z.string().optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return db.updateJobBoard(id, data);
        }),

      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return db.deleteJobBoard(input.id);
        }),
    }),

    // Seed sample jobs (for demo purposes)
    seedJobs: adminProcedure.mutation(async () => {
      const sampleJobs = [
        {
          title: "Senior Frontend Developer",
          company: "TechCorp Inc.",
          location: "San Francisco, CA",
          locationType: "hybrid" as const,
          salary: "$150,000 - $180,000",
          salaryMin: 150000,
          salaryMax: 180000,
          description: "We are looking for a Senior Frontend Developer to join our team. You will be responsible for building and maintaining our web applications using React, TypeScript, and modern frontend technologies.",
          requirements: ["5+ years of experience with React", "Strong TypeScript skills", "Experience with state management", "Knowledge of testing frameworks"],
          benefits: ["Health insurance", "401k matching", "Remote work options", "Unlimited PTO"],
          employmentType: "full-time" as const,
          experienceLevel: "senior" as const,
          postedAt: new Date(),
          isActive: true,
        },
        {
          title: "Full Stack Engineer",
          company: "StartupXYZ",
          location: "New York, NY",
          locationType: "remote" as const,
          salary: "$120,000 - $160,000",
          salaryMin: 120000,
          salaryMax: 160000,
          description: "Join our fast-growing startup as a Full Stack Engineer. Work on exciting projects using Node.js, React, and PostgreSQL.",
          requirements: ["3+ years of full stack experience", "Node.js and React proficiency", "Database design skills", "API development experience"],
          benefits: ["Equity package", "Flexible hours", "Learning budget", "Team retreats"],
          employmentType: "full-time" as const,
          experienceLevel: "mid" as const,
          postedAt: new Date(),
          isActive: true,
        },
        {
          title: "Junior Software Developer",
          company: "Innovation Labs",
          location: "Austin, TX",
          locationType: "onsite" as const,
          salary: "$70,000 - $90,000",
          salaryMin: 70000,
          salaryMax: 90000,
          description: "Great opportunity for a junior developer to grow their skills. Mentorship program included.",
          requirements: ["CS degree or bootcamp graduate", "Basic programming knowledge", "Eagerness to learn", "Team player"],
          benefits: ["Mentorship program", "Training budget", "Health benefits", "Gym membership"],
          employmentType: "full-time" as const,
          experienceLevel: "entry" as const,
          postedAt: new Date(),
          isActive: true,
        },
        {
          title: "DevOps Engineer",
          company: "CloudScale",
          location: "Seattle, WA",
          locationType: "hybrid" as const,
          salary: "$140,000 - $170,000",
          salaryMin: 140000,
          salaryMax: 170000,
          description: "Looking for a DevOps Engineer to help us scale our infrastructure. Experience with AWS, Kubernetes, and CI/CD required.",
          requirements: ["AWS certification preferred", "Kubernetes experience", "CI/CD pipeline expertise", "Infrastructure as code"],
          benefits: ["Stock options", "Remote flexibility", "Conference budget", "Premium healthcare"],
          employmentType: "full-time" as const,
          experienceLevel: "senior" as const,
          postedAt: new Date(),
          isActive: true,
        },
        {
          title: "Product Designer",
          company: "DesignFirst",
          location: "Los Angeles, CA",
          locationType: "remote" as const,
          salary: "$110,000 - $140,000",
          salaryMin: 110000,
          salaryMax: 140000,
          description: "We need a talented Product Designer to create beautiful and intuitive user experiences.",
          requirements: ["Figma expertise", "User research experience", "Design system knowledge", "Prototyping skills"],
          benefits: ["Creative freedom", "Design tools budget", "Flexible schedule", "Health & dental"],
          employmentType: "full-time" as const,
          experienceLevel: "mid" as const,
          postedAt: new Date(),
          isActive: true,
        },
        {
          title: "Data Scientist",
          company: "DataDriven Co",
          location: "Boston, MA",
          locationType: "hybrid" as const,
          salary: "$130,000 - $160,000",
          salaryMin: 130000,
          salaryMax: 160000,
          description: "Join our data science team to build ML models and derive insights from large datasets.",
          requirements: ["Python and SQL proficiency", "ML/AI experience", "Statistics background", "Communication skills"],
          benefits: ["Research time", "Conference attendance", "Competitive salary", "Parental leave"],
          employmentType: "full-time" as const,
          experienceLevel: "mid" as const,
          postedAt: new Date(),
          isActive: true,
        },
      ];

      await db.bulkCreateJobs(sampleJobs);
      return { success: true, count: sampleJobs.length };
    }),
  }),
});

export type AppRouter = typeof appRouter;
