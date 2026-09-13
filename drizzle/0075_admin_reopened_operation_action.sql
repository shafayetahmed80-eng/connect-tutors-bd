-- An Admin sending an Appointed tuition back to Live after the demo class is
-- recorded in the request's operation history like every other Admin decision.
ALTER TABLE `tutor_request_operation_events` MODIFY COLUMN `action` enum('guardian_updated','admin_updated','admin_confirmed','admin_cancelled','guardian_cancelled','admin_appointed','admin_declined_appointment','admin_reopened') NOT NULL;
