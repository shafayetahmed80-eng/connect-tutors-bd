-- A job on the Job Board no longer expires. It stays until an Admin takes the tuition to
-- Appointed, Confirmed or Cancelled, and nobody extends a listing or takes one off the board
-- any more, so the end date and the extension call have nothing left to record.
--
-- The listings whose date has already passed are not on the board today, and are not to come
-- back on it the moment their date stops mattering. A tuition that was still Live goes to
-- Pending (the "unpublished" step, which the Posted jobs board takes Live again in one click),
-- an Appointed tuition keeps its Tutor and only loses its listing, and a Confirmed or cancelled one
-- is closed, as it was. Nothing is deleted.
--
-- The end date and the extension-call column are dropped with the rows' values in them. Take
-- the database backup first.
UPDATE `tutor_requests` AS r
INNER JOIN `tutor_jobs` AS j ON j.`tutorRequestId` = r.`id`
SET r.`publicationState` = 'unpublished'
WHERE j.`publicationStatus` = 'published'
  AND j.`expiresAt` < NOW()
  AND r.`publicationState` = 'published'
  AND r.`status` <> 'closed'
  AND r.`appointmentConfirmedAt` IS NULL
  AND NOT (r.`status` = 'matched' AND r.`tutorId` IS NOT NULL);--> statement-breakpoint
UPDATE `tutor_jobs` AS j
INNER JOIN `tutor_requests` AS r ON r.`id` = j.`tutorRequestId`
SET j.`publicationStatus` = CASE
      WHEN r.`status` = 'closed' OR r.`publicationState` = 'closed' OR r.`appointmentConfirmedAt` IS NOT NULL THEN 'closed'
      ELSE 'unpublished'
    END,
    j.`deactivatedAt` = COALESCE(j.`deactivatedAt`, NOW())
WHERE j.`publicationStatus` = 'published'
  AND j.`expiresAt` < NOW();--> statement-breakpoint
-- The three indexes below each ended in the end date, and the board reads newest first.
CREATE INDEX `tutor_jobs_publication_idx` ON `tutor_jobs` (`publicationStatus`, `publishedAt`);--> statement-breakpoint
CREATE INDEX `tutor_jobs_city_idx` ON `tutor_jobs` (`cityLocationId`);--> statement-breakpoint
CREATE INDEX `tutor_jobs_location_idx` ON `tutor_jobs` (`locationId`);--> statement-breakpoint
DROP INDEX `tutor_jobs_publication_expiry_idx` ON `tutor_jobs`;--> statement-breakpoint
DROP INDEX `tutor_jobs_city_expiry_idx` ON `tutor_jobs`;--> statement-breakpoint
DROP INDEX `tutor_jobs_location_expiry_idx` ON `tutor_jobs`;--> statement-breakpoint
ALTER TABLE `tutor_jobs` DROP COLUMN `expiresAt`;--> statement-breakpoint
ALTER TABLE `tutor_requests` DROP COLUMN `guardianReconfirmedAt`;--> statement-breakpoint
-- An Owner's change to "Job expires after" has nothing left to apply to.
DELETE FROM `site_limits` WHERE `limitId` = 'jobBoard.expiryDays';
