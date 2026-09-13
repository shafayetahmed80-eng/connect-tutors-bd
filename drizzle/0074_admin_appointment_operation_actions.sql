-- An Admin appointing an applicant, and declining a Guardian's appointment
-- request, are recorded in the request's operation history like every other
-- Admin decision on it.
ALTER TABLE `tutor_request_operation_events` MODIFY COLUMN `action` enum('guardian_updated','admin_updated','admin_confirmed','admin_cancelled','guardian_cancelled','admin_appointed','admin_declined_appointment') NOT NULL;
