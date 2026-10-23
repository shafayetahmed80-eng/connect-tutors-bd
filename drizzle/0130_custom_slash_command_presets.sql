ALTER TABLE `admin_message_templates` ADD `command` varchar(40);--> statement-breakpoint
CREATE INDEX `admin_message_templates_command_idx` ON `admin_message_templates` (`command`);
