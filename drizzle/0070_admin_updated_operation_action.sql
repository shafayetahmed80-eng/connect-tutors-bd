ALTER TABLE `tutor_request_operation_events` MODIFY COLUMN `action` enum('guardian_updated','admin_updated','admin_confirmed','admin_cancelled','guardian_cancelled') NOT NULL;
