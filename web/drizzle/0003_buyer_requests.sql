CREATE TABLE `buyer_requests` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`deal` enum('buy','rent') NOT NULL,
	`category` enum('condo','house','townhome','land','apartment','commercial') NOT NULL,
	`province` varchar(80) NOT NULL,
	`area` varchar(120) NOT NULL,
	`max_budget` decimal(14,2) NOT NULL,
	`min_size` int,
	`criteria` text,
	`status` enum('active','closed') NOT NULL DEFAULT 'active',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `buyer_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `buyer_requests` ADD CONSTRAINT `buyer_requests_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `buyer_requests_user_idx` ON `buyer_requests` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `buyer_requests_status_idx` ON `buyer_requests` (`status`,`province`);