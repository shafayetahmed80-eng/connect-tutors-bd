CREATE TABLE `auth_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event` enum('login_success','login_failure','login_blocked','login_account_suspended','login_account_closed','registration_success','registration_rejected','registration_blocked','phone_intake','phone_intake_blocked') NOT NULL,
	`role` enum('tutor','guardian','admin'),
	`ip` varchar(64),
	`identifierMasked` varchar(128),
	`reason` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `locations` ADD CONSTRAINT `locations_parent_type_label_unique` UNIQUE(`parentId`,`type`,`label`);--> statement-breakpoint
CREATE INDEX `auth_events_event_created_idx` ON `auth_events` (`event`,`createdAt`);--> statement-breakpoint
CREATE INDEX `auth_events_ip_created_idx` ON `auth_events` (`ip`,`createdAt`);