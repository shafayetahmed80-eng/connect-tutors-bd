ALTER TABLE `tutor_requests` ADD `paymentCompletedAt` timestamp NULL;--> statement-breakpoint
UPDATE `tutor_requests` r SET r.`paymentCompletedAt` = COALESCE((SELECT MAX(p.`paidAt`) FROM `tuition_payments` p WHERE p.`tutorRequestId` = r.`id` AND p.`status` = 'verified'), r.`appointmentConfirmedAt`) WHERE r.`paymentStatus` = 'full_paid' AND r.`appointmentConfirmedAt` IS NOT NULL;
