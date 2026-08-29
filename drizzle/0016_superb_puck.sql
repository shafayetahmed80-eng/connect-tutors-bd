ALTER TABLE `users` ADD `loginPhone` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_role_login_phone_unique` UNIQUE(`role`,`loginPhone`);