-- Tutors gain a separate City field alongside their existing Location, mirroring
-- the Guardian side. Nullable: existing rows predate this and have no city on
-- file; it is set from registration going forward and stays editable after.
ALTER TABLE `tutors`
  ADD COLUMN `cityLocationId` varchar(80) AFTER `preferredStudentGender`;
