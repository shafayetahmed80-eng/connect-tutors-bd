-- A Tutor is Verified while at least one of their tuitions is Confirmed (not cancelled).
UPDATE `tutors` t SET t.`verified` = IF(EXISTS (SELECT 1 FROM `tutor_requests` r WHERE r.`tutorId` = t.`id` AND r.`appointmentConfirmedAt` IS NOT NULL AND r.`status` <> 'closed' AND r.`publicationState` <> 'closed'), 1, 0);
