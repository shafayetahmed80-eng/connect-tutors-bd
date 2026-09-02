CREATE TABLE `site_policy_documents` (
	`pageKey` varchar(60) NOT NULL,
	`body` mediumtext NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_policy_documents_pageKey` PRIMARY KEY(`pageKey`)
);
