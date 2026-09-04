-- A Guardian can now close their own request, so the operation log needs a word
-- for who did it. `admin_cancelled` stays exactly as it was.
ALTER TABLE `tutor_request_operation_events`
  MODIFY COLUMN `action` ENUM('guardian_updated','admin_confirmed','admin_cancelled','guardian_cancelled') NOT NULL;
