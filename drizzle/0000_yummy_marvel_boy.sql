CREATE TABLE `locations` (
	`id` varchar(80) NOT NULL,
	`label` varchar(160) NOT NULL,
	`type` enum('country','city','division','district','area') NOT NULL,
	`country` varchar(120) NOT NULL,
	`parentId` varchar(80),
	`enabled` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tutor_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`guardianUserId` int NOT NULL,
	`tuitionType` enum('home','online','both') NOT NULL,
	`category` varchar(120) NOT NULL,
	`classCourse` varchar(120) NOT NULL,
	`subjects` text NOT NULL,
	`daysPerWeek` int NOT NULL,
	`preferredGender` enum('male','female','any') NOT NULL DEFAULT 'any',
	`monthlyBudget` int,
	`locationText` varchar(240) NOT NULL,
	`status` enum('new','reviewing','matched','closed') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tutors` (
	`id` varchar(32) NOT NULL,
	`userId` int,
	`name` varchar(160) NOT NULL,
	`initials` varchar(8) NOT NULL,
	`accent` varchar(20) NOT NULL,
	`headline` varchar(240) NOT NULL,
	`institution` varchar(240) NOT NULL,
	`education` varchar(240) NOT NULL,
	`subjects` text NOT NULL,
	`levels` text NOT NULL,
	`experience` int NOT NULL,
	`fee` int NOT NULL,
	`gender` enum('male','female') NOT NULL,
	`mode` enum('home','online','both') NOT NULL,
	`locationId` varchar(80) NOT NULL,
	`availability` varchar(160) NOT NULL,
	`verified` int NOT NULL DEFAULT 0,
	`languages` text NOT NULL,
	`about` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tutors_id` PRIMARY KEY(`id`),
	CONSTRAINT `tutors_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('guardian','tutor','admin','user') NOT NULL DEFAULT 'guardian',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
