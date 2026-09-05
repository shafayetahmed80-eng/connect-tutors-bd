-- Owner overrides for Tutor Profile field section/order/enabled/required, on
-- top of the shipped defaults in shared/tutor-profile-field-registry.ts.
-- Every axis is independently nullable; a NULL column always means "use the
-- registry default for this one axis" - the same sparse-overrides shape as
-- site_limits. An empty table renders/validates exactly like the registry.
CREATE TABLE `tutor_profile_field_overrides` (
	`fieldId` varchar(120) NOT NULL,
	`section` varchar(10),
	`subGroup` varchar(20),
	`sortOrder` int,
	`enabled` int,
	`required` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tutor_profile_field_overrides_fieldId` PRIMARY KEY(`fieldId`)
);
