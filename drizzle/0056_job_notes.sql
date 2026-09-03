-- The Guardian's note now travels with a published job. It was deliberately
-- withheld before; it is published now because an Admin reads and approves a
-- request before it reaches the board.
ALTER TABLE `tutor_jobs` ADD `notes` text;
