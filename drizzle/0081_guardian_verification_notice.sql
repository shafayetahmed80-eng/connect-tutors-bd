-- A Guardian's profile verification is not about any one tuition, so its notice carries no request.
ALTER TABLE `guardian_request_notifications` MODIFY COLUMN `tutorRequestId` int NULL;--> statement-breakpoint
ALTER TABLE `guardian_request_notifications` MODIFY COLUMN `type` enum('lifecycle','follow_up','confirmation_letter_issued','verification') NOT NULL;
