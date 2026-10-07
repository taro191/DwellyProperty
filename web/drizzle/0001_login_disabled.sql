ALTER TABLE `profiles` ADD `login_disabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `login_disabled_reason` varchar(300);