-- How much of a Confirmed tuition's fee has been paid; every tuition starts at Full Due.
ALTER TABLE `tutor_requests` ADD COLUMN `paymentStatus` enum('full_due','half_paid','partial_paid','full_paid') NOT NULL DEFAULT 'full_due';--> statement-breakpoint
-- An Admin changing it is recorded in the request's operation history like every other Admin decision.
ALTER TABLE `tutor_request_operation_events` MODIFY COLUMN `action` enum('guardian_updated','admin_updated','admin_confirmed','admin_cancelled','guardian_cancelled','admin_appointed','admin_declined_appointment','admin_reopened','admin_payment_status_changed') NOT NULL;--> statement-breakpoint
-- 0078 backfilled some Confirmed tuitions with an appointment date after their confirmation; no Tutor is appointed after being confirmed.
UPDATE `tutor_requests` SET `appointedAt` = `appointmentConfirmedAt` WHERE `appointmentConfirmedAt` IS NOT NULL AND (`appointedAt` IS NULL OR `appointedAt` > `appointmentConfirmedAt`);
