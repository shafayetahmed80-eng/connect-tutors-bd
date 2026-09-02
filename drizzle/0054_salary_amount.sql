ALTER TABLE `tutor_requests` ADD `budgetAmount` int;--> statement-breakpoint
ALTER TABLE `tutor_jobs` ADD `budgetAmount` int;--> statement-breakpoint
-- A request that named a range keeps the lower figure as its single amount:
-- that is the number the Guardian was willing to start from, and it is the
-- honest reading of "5,000 to 7,000". Rows that chose "Discuss with
-- coordinator" carry no number at all and stay null - they will read "Not set"
-- until the Guardian edits the request.
UPDATE `tutor_requests` SET `budgetAmount` = `budgetMinimum` WHERE `budgetMode` = 'range' AND `budgetMinimum` IS NOT NULL;--> statement-breakpoint
UPDATE `tutor_jobs` SET `budgetAmount` = `budgetMinimum` WHERE `budgetMode` = 'range' AND `budgetMinimum` IS NOT NULL;
