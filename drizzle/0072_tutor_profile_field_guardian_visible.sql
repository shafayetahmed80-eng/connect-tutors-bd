-- Which Tutor Profile fields a Guardian sees on an applicant's profile page.
-- NULL keeps the registry default in shared/tutor-profile-field-registry.ts;
-- the private fields listed there (contact, family and emergency contact,
-- documents, notes for the review team) ignore this column entirely.
ALTER TABLE `tutor_profile_field_overrides` ADD COLUMN `guardianVisible` int;
