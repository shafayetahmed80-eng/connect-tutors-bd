-- Two answers a Guardian gives with a request and nobody on the Job Board sees.
--
-- `instituteName` is free text on purpose: the Guardian types where the student
-- studies rather than hunting through the 311-row institute catalogue, which
-- means one school will arrive spelled several ways. Nullable because it is
-- optional, and because every request made before today has no answer.
--
-- `heardAboutUs` is ours to count. It is nullable for the same reason - the
-- rows that predate this column were never asked.
ALTER TABLE `tutor_requests` ADD `instituteName` varchar(120);--> statement-breakpoint
ALTER TABLE `tutor_requests` ADD `heardAboutUs` enum('friends_family','facebook','websites','others');
