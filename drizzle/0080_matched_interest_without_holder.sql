-- Some demo applications were left `matched` on tuitions no Tutor holds (older flows), so they read "Appointed" on a Live tuition. Put them back to Applied.
UPDATE `tutor_job_interests` i
JOIN `tutor_jobs` j ON j.`id` = i.`tutorJobId`
JOIN `tutor_requests` r ON r.`id` = j.`tutorRequestId`
SET i.`status` = 'interested'
WHERE i.`status` = 'matched' AND (r.`tutorId` IS NULL OR r.`tutorId` <> i.`tutorId`);
