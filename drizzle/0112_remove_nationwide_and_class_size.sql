-- Available Nationwide and Preferred Class Size left the Tutor profile for good: nothing
-- else reads them, and no Tutor is asked for them any more.
--
-- The rows in them are dropped with them. Take the database backup first.
DROP TABLE `tutor_preferred_class_sizes`;--> statement-breakpoint
ALTER TABLE `tutors` DROP COLUMN `nationwideAvailability`;--> statement-breakpoint
-- An Owner's Admin-panel changes to either field (its label, whether it is required, its
-- order) have nothing left to apply to.
DELETE FROM `tutor_profile_field_overrides` WHERE `fieldId` IN ('availableNationwide', 'preferredClassSizes');
