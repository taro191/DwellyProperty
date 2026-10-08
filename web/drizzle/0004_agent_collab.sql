CREATE TABLE `collab_logs` (
	`id` varchar(36) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`deal` enum('sale','rent') NOT NULL,
	`kind` enum('viewing','lead_lock','customer_feedback','offer_submitted','marketing','owner_notice') NOT NULL,
	`client_name` varchar(80),
	`client_phone_last4` varchar(4),
	`amount` decimal(14,2),
	`interest` enum('ready_to_book','interested_high','considering'),
	`summary` text NOT NULL,
	`lock_until` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `collab_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `listing_agents` (
	`id` varchar(36) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`agent_id` varchar(36) NOT NULL,
	`deal` enum('sale','rent') NOT NULL,
	`contract` enum('open_multi','exclusive') NOT NULL DEFAULT 'open_multi',
	`commission` varchar(80) NOT NULL,
	`status` enum('active','ended') NOT NULL DEFAULT 'active',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `listing_agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `listing_agents_uq` UNIQUE(`property_id`,`agent_id`,`deal`)
);
--> statement-breakpoint
ALTER TABLE `collab_logs` ADD CONSTRAINT `collab_logs_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `collab_logs` ADD CONSTRAINT `collab_logs_author_id_profiles_id_fk` FOREIGN KEY (`author_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_agents` ADD CONSTRAINT `listing_agents_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_agents` ADD CONSTRAINT `listing_agents_agent_id_profiles_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `collab_logs_property_idx` ON `collab_logs` (`property_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `listing_agents_agent_idx` ON `listing_agents` (`agent_id`,`status`);