-- The Matching workspace is gone, and what only it kept goes with it: the Saved Views an Admin
-- made there, the assignment notes Admins wrote, and the date of the recorded Guardian call.
-- A tuition's history (the Job Board moves and the changes made to the request) is not touched.
--
-- The rows in them are dropped with them. Take the database backup first.
DROP TABLE `admin_matching_default_saved_views`;--> statement-breakpoint
DROP TABLE `admin_matching_saved_views`;--> statement-breakpoint
DROP TABLE `tutor_request_assignment_notes`;--> statement-breakpoint
ALTER TABLE `tutor_requests` DROP COLUMN `guardianConfirmedAt`;
