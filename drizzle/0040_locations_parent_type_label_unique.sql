-- Split out of 0039 so `auth_events` deploys cleanly. This UNIQUE will fail
-- (MySQL error 1062) on any DB that still holds duplicate location rows, so an
-- operator MUST run `node scripts/cleanup-duplicate-locations.mjs --apply`
-- against the target DB before applying this migration.
ALTER TABLE `locations` ADD CONSTRAINT `locations_parent_type_label_unique` UNIQUE(`parentId`,`type`,`label`);
