-- The seed row `sirajganj-sadar` was created with the mixed-script label
-- 'Sirajগঞ্জ Sadar'. Fix the place and every label already copied from it.
UPDATE `locations` SET `label` = 'Sirajganj Sadar' WHERE `id` = 'sirajganj-sadar' AND `label` = 'Sirajগঞ্জ Sadar';
--> statement-breakpoint
UPDATE `tutor_requests` SET `tuitionLocationLabel` = REPLACE(`tuitionLocationLabel`, 'Sirajগঞ্জ Sadar', 'Sirajganj Sadar') WHERE `tuitionLocationLabel` LIKE '%Sirajগঞ্জ Sadar%';
--> statement-breakpoint
UPDATE `tutor_jobs` SET `locationLabel` = REPLACE(`locationLabel`, 'Sirajগঞ্জ Sadar', 'Sirajganj Sadar') WHERE `locationLabel` LIKE '%Sirajগঞ্জ Sadar%';
