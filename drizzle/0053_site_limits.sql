CREATE TABLE `site_limits` (
	`limitId` varchar(60) NOT NULL,
	`value` int NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_limits_limitId` PRIMARY KEY(`limitId`)
);
