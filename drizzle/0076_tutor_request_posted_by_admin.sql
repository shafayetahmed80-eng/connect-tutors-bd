-- Whether an Admin added this tuition from Posted jobs, rather than a Guardian
-- posting it. Kept on the request itself: an Admin can add a tuition for a
-- Guardian who registered, so the Guardian account cannot tell the two apart.
ALTER TABLE `tutor_requests` ADD COLUMN `postedByAdmin` int NOT NULL DEFAULT 0;--> statement-breakpoint
-- What can be known about earlier rows: a Guardian account an Admin created only
-- ever came from Add Tuition.
UPDATE `tutor_requests` r JOIN `users` u ON u.`id` = r.`guardianUserId` SET r.`postedByAdmin` = 1 WHERE u.`openId` LIKE 'admin-posted:guardian:%';
