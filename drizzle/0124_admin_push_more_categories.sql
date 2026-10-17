ALTER TABLE `admin_push_preferences` ADD `notifyGuardianRequests` boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE `admin_push_preferences` ADD `notifyAccountChanges` boolean DEFAULT true NOT NULL;
