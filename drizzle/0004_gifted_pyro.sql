CREATE TABLE `tutor_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorNumber` int NOT NULL,
	`userId` int NOT NULL,
	`registeredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tutor_registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `tutor_registrations_tutorNumber_unique` UNIQUE(`tutorNumber`),
	CONSTRAINT `tutor_registrations_userId_unique` UNIQUE(`userId`)
);
