ALTER TABLE `tutor_education_records` ADD `passingYear` int;--> statement-breakpoint
ALTER TABLE `tutor_education_records` ADD `rollNumber` varchar(60);--> statement-breakpoint
ALTER TABLE `tutor_education_records` ADD `registrationNumber` varchar(60);--> statement-breakpoint
UPDATE `tutor_education_records` SET `passingYear` = `studyEndYear` WHERE `qualificationLevel` IN ('SSC','HSC') AND `studyEndYear` IS NOT NULL;
