CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobId` int NOT NULL,
	`resumeId` int,
	`templateId` int,
	`status` enum('draft','pending','submitted','viewed','interview','offered','rejected','withdrawn') NOT NULL DEFAULT 'draft',
	`coverLetter` text,
	`customAnswers` json,
	`appliedAt` timestamp,
	`lastStatusUpdate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jobBoards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`logoUrl` varchar(512),
	`websiteUrl` varchar(512),
	`apiEndpoint` varchar(512),
	`isActive` boolean DEFAULT true,
	`successRate` int DEFAULT 0,
	`totalApplications` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobBoards_id` PRIMARY KEY(`id`),
	CONSTRAINT `jobBoards_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`externalId` varchar(128),
	`jobBoardId` int,
	`title` varchar(256) NOT NULL,
	`company` varchar(256) NOT NULL,
	`companyLogo` varchar(512),
	`location` varchar(256),
	`locationType` enum('remote','hybrid','onsite') DEFAULT 'onsite',
	`salary` varchar(128),
	`salaryMin` int,
	`salaryMax` int,
	`description` text,
	`requirements` json,
	`benefits` json,
	`employmentType` enum('full-time','part-time','contract','internship') DEFAULT 'full-time',
	`experienceLevel` enum('entry','mid','senior','lead','executive'),
	`applicationUrl` varchar(1024),
	`postedAt` timestamp,
	`expiresAt` timestamp,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`fileUrl` varchar(1024) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`mimeType` varchar(128),
	`fileSize` int,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resumes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`type` enum('cover_letter','application_form') NOT NULL,
	`content` text NOT NULL,
	`variables` json,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `location` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `headline` varchar(256);--> statement-breakpoint
ALTER TABLE `users` ADD `summary` text;--> statement-breakpoint
ALTER TABLE `users` ADD `linkedinUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `portfolioUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `githubUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `users` ADD `skills` json;--> statement-breakpoint
ALTER TABLE `users` ADD `experience` json;--> statement-breakpoint
ALTER TABLE `users` ADD `education` json;