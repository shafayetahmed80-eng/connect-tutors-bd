ALTER TABLE `tutor_requests` ADD `studentCount` int;--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD `studentGender` enum('male','female');--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD `addressDetails` varchar(160);
