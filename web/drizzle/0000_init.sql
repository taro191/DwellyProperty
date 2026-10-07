CREATE TABLE `account` (
	`id` varchar(36) NOT NULL,
	`account_id` varchar(191) NOT NULL,
	`provider_id` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` datetime(3),
	`refresh_token_expires_at` datetime(3),
	`scope` text,
	`password` text,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `account_deletion_requests` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`reason` text,
	`status` enum('pending','processing','completed','cancelled') NOT NULL DEFAULT 'pending',
	`processed_by` varchar(36),
	`requested_at` datetime(3) NOT NULL,
	`processed_at` datetime(3),
	CONSTRAINT `account_deletion_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activities` (
	`id` varchar(36) NOT NULL,
	`hub_id` varchar(36),
	`property_id` varchar(36),
	`host_id` varchar(36),
	`type` enum('live_tour','open_house','live_qa','workshop','consultation') NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text,
	`starts_at` datetime(3) NOT NULL,
	`duration_min` smallint NOT NULL DEFAULT 60,
	`seats` int,
	`location` varchar(200),
	`meeting_url` varchar(500),
	`status` enum('draft','published','cancelled','completed') NOT NULL DEFAULT 'draft',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_registrations` (
	`activity_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `activity_registrations_activity_id_user_id_pk` PRIMARY KEY(`activity_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `agency_pods` (
	`id` varchar(36) NOT NULL,
	`code` varchar(16) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` text,
	`zone_id` varchar(36),
	`leader_id` varchar(36) NOT NULL,
	`status` enum('pending','verified','suspended') NOT NULL DEFAULT 'pending',
	`trust_score` smallint NOT NULL DEFAULT 0,
	`insurance_coverage` decimal(14,2) NOT NULL DEFAULT 0,
	`verifications` json NOT NULL,
	`rating_avg` decimal(3,2) NOT NULL DEFAULT 0,
	`rating_count` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `agency_pods_id` PRIMARY KEY(`id`),
	CONSTRAINT `agency_pods_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `agent_profiles` (
	`user_id` varchar(36) NOT NULL,
	`agent_code` varchar(12) NOT NULL,
	`english_name` varchar(80),
	`title` varchar(120),
	`company_name` varchar(120),
	`license_no` varchar(50),
	`license_verified` boolean NOT NULL DEFAULT false,
	`experience_years` smallint,
	`specialized_zones` json NOT NULL,
	`specialized_categories` json NOT NULL,
	`certificates` json NOT NULL,
	`rating_avg` decimal(3,2) NOT NULL DEFAULT 0,
	`rating_count` int NOT NULL DEFAULT 0,
	`closed_deals` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `agent_profiles_user_id` PRIMARY KEY(`user_id`),
	CONSTRAINT `agent_profiles_agent_code_unique` UNIQUE(`agent_code`)
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` varchar(64) NOT NULL,
	`value` json NOT NULL,
	`updated_by` varchar(36),
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `app_settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` varchar(36) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`buyer_id` varchar(36) NOT NULL,
	`seller_id` varchar(36) NOT NULL,
	`format` enum('onsite','video') NOT NULL DEFAULT 'onsite',
	`scheduled_at` datetime(3) NOT NULL,
	`duration_min` smallint NOT NULL DEFAULT 45,
	`status` enum('pending','confirmed','declined','cancelled','completed','no_show') NOT NULL DEFAULT 'pending',
	`buyer_note` text,
	`seller_note` text,
	`meeting_url` varchar(500),
	`cancelled_by` varchar(36),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`actor_id` varchar(36),
	`action` varchar(64) NOT NULL,
	`entity_type` varchar(64) NOT NULL,
	`entity_id` varchar(64),
	`summary` text,
	`data` json NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `boost_products` (
	`id` varchar(40) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`price_thb` decimal(10,2) NOT NULL,
	`duration_days` int NOT NULL,
	`placement` varchar(30) NOT NULL DEFAULT 'featured',
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `boost_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `boosts` (
	`id` varchar(36) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`product_id` varchar(40) NOT NULL,
	`order_id` varchar(36),
	`placement` varchar(30) NOT NULL,
	`starts_at` datetime(3) NOT NULL,
	`ends_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `boosts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commission_access_requests` (
	`id` varchar(36) NOT NULL,
	`agent_id` varchar(36) NOT NULL,
	`property_id` varchar(36),
	`status` enum('pending','approved','rejected','revoked') NOT NULL DEFAULT 'pending',
	`message` text,
	`reviewed_by` varchar(36),
	`reviewed_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `commission_access_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `commission_programs` (
	`property_id` varchar(36) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`sale_rate_pct` decimal(5,2),
	`rent_month1_rate_pct` decimal(6,2),
	`rent_month2_rate_pct` decimal(6,2),
	`rent_month3_plus_rate_pct` decimal(6,2),
	`renewal_rate_pct` decimal(6,2),
	`terms` text,
	`starts_on` date,
	`ends_on` date,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `commission_programs_property_id` PRIMARY KEY(`property_id`)
);
--> statement-breakpoint
CREATE TABLE `consents` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`kind` enum('terms','privacy','marketing') NOT NULL,
	`version` varchar(20) NOT NULL,
	`granted` boolean NOT NULL,
	`user_agent` varchar(300),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversation_participants` (
	`conversation_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`last_read_at` datetime(3),
	`archived` boolean NOT NULL DEFAULT false,
	`joined_at` datetime(3) NOT NULL,
	CONSTRAINT `conversation_participants_conversation_id_user_id_pk` PRIMARY KEY(`conversation_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` varchar(36) NOT NULL,
	`property_id` varchar(36),
	`created_by` varchar(36),
	`last_message_at` datetime(3),
	`last_message_preview` varchar(160),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `counters` (
	`name` varchar(32) NOT NULL,
	`value` int NOT NULL,
	CONSTRAINT `counters_name` PRIMARY KEY(`name`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`user_id` varchar(36) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `favorites_user_id_property_id_pk` PRIMARY KEY(`user_id`,`property_id`)
);
--> statement-breakpoint
CREATE TABLE `hub_properties` (
	`hub_id` varchar(36) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`added_at` datetime(3) NOT NULL,
	CONSTRAINT `hub_properties_hub_id_property_id_pk` PRIMARY KEY(`hub_id`,`property_id`)
);
--> statement-breakpoint
CREATE TABLE `hubs` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(60) NOT NULL,
	`name` varchar(120) NOT NULL,
	`theme` varchar(120),
	`description` text,
	`zone_id` varchar(36),
	`banner_url` text,
	`status` enum('draft','scheduled','live','ended') NOT NULL DEFAULT 'draft',
	`starts_at` datetime(3) NOT NULL,
	`ends_at` datetime(3) NOT NULL,
	`created_by` varchar(36),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `hubs_id` PRIMARY KEY(`id`),
	CONSTRAINT `hubs_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` varchar(36) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`buyer_id` varchar(36) NOT NULL,
	`seller_id` varchar(36) NOT NULL,
	`intent` enum('buy','rent','invest','info') NOT NULL,
	`status` enum('new','contacted','qualified','won','lost') NOT NULL DEFAULT 'new',
	`message` text,
	`contact_phone` varchar(20),
	`budget` decimal(14,2),
	`seller_notes` text,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`invoice_no` varchar(20) NOT NULL,
	`bill_to_name` varchar(200) NOT NULL,
	`bill_to_tax_id` varchar(20),
	`bill_to_address` text,
	`subtotal_thb` decimal(12,2) NOT NULL,
	`vat_thb` decimal(12,2) NOT NULL,
	`total_thb` decimal(12,2) NOT NULL,
	`pdf_path` varchar(300),
	`issued_at` datetime(3) NOT NULL,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_order_id_unique` UNIQUE(`order_id`),
	CONSTRAINT `invoices_invoice_no_unique` UNIQUE(`invoice_no`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` varchar(36) NOT NULL,
	`conversation_id` varchar(36) NOT NULL,
	`sender_id` varchar(36) NOT NULL,
	`body` text,
	`attachment_path` varchar(300),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` varchar(40) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` text,
	`link` varchar(300),
	`entity_type` varchar(40),
	`entity_id` varchar(36),
	`read_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `offers` (
	`id` varchar(36) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`buyer_id` varchar(36) NOT NULL,
	`seller_id` varchar(36) NOT NULL,
	`kind` enum('purchase','rent') NOT NULL,
	`listed_price` decimal(14,2) NOT NULL,
	`offer_price` decimal(14,2) NOT NULL,
	`counter_price` decimal(14,2),
	`buyer_note` text,
	`seller_note` text,
	`valid_until` datetime(3) NOT NULL,
	`status` enum('pending','countered','accepted','rejected','withdrawn','expired') NOT NULL DEFAULT 'pending',
	`responded_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `offers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`kind` enum('subscription','boost') NOT NULL,
	`plan_id` varchar(40),
	`boost_product_id` varchar(40),
	`property_id` varchar(36),
	`amount_thb` decimal(12,2) NOT NULL,
	`vat_thb` decimal(12,2) NOT NULL DEFAULT 0,
	`status` enum('pending','paid','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
	`provider` varchar(30),
	`provider_ref` varchar(120),
	`paid_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_provider_ref_idx` UNIQUE(`provider`,`provider_ref`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` varchar(40) NOT NULL,
	`audience` enum('owner','agent','investor') NOT NULL,
	`name` varchar(120) NOT NULL,
	`badge` varchar(60),
	`description` text,
	`price_thb` decimal(10,2) NOT NULL,
	`period` enum('month','year','lifetime') NOT NULL,
	`features` json NOT NULL,
	`quotas` json NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pod_members` (
	`pod_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role` enum('leader','member') NOT NULL DEFAULT 'member',
	`joined_at` datetime(3) NOT NULL,
	CONSTRAINT `pod_members_pod_id_user_id_pk` PRIMARY KEY(`pod_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` varchar(36) NOT NULL,
	`display_name` varchar(80) NOT NULL DEFAULT '',
	`avatar_url` text,
	`bio` text,
	`primary_role` enum('buyer','tenant','owner','investor','agent') NOT NULL DEFAULT 'buyer',
	`status` enum('active','suspended','banned','deleted') NOT NULL DEFAULT 'active',
	`status_reason` text,
	`is_kyc_verified` boolean NOT NULL DEFAULT false,
	`kyc_verified_at` datetime(3),
	`locale` enum('th','en') NOT NULL DEFAULT 'th',
	`onboarded_at` datetime(3),
	`phone` varchar(20),
	`phone_verified` boolean NOT NULL DEFAULT false,
	`line_id` varchar(50),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` varchar(36) NOT NULL,
	`code` varchar(12) NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`agent_id` varchar(36),
	`pod_id` varchar(36),
	`zone_id` varchar(36),
	`listing_type` enum('sale','rent','sale_or_rent') NOT NULL,
	`category` enum('condo','house','townhome','land','apartment','commercial') NOT NULL,
	`status` enum('draft','pending_review','active','reserved','sold','rented','expired','rejected','archived') NOT NULL DEFAULT 'draft',
	`rejection_reason` text,
	`title` varchar(150) NOT NULL,
	`description` text,
	`project_name` varchar(150),
	`sale_price` decimal(14,2),
	`rent_price` decimal(12,2),
	`price_negotiable` boolean NOT NULL DEFAULT true,
	`usable_area_sqm` decimal(10,2),
	`land_area_sqwa` decimal(10,2),
	`bedrooms` smallint,
	`bathrooms` smallint,
	`floor` smallint,
	`total_floors` smallint,
	`direction` enum('N','NE','E','SE','S','SW','W','NW'),
	`furnishing` enum('unfurnished','partial','full'),
	`maintenance_fee` decimal(10,2),
	`year_built` smallint,
	`available_from` date,
	`deposit_months` decimal(4,1),
	`advance_months` decimal(4,1),
	`min_lease_months` smallint,
	`pets_allowed` boolean,
	`land_details` json NOT NULL,
	`tags` json NOT NULL,
	`amenities` json NOT NULL,
	`province` varchar(80) NOT NULL,
	`district` varchar(80),
	`subdistrict` varchar(80),
	`postal_code` varchar(5),
	`address_line` varchar(300),
	`lat` decimal(9,6),
	`lng` decimal(9,6),
	`show_exact_location` boolean NOT NULL DEFAULT false,
	`is_verified` boolean NOT NULL DEFAULT false,
	`verified_at` datetime(3),
	`featured_until` datetime(3),
	`views_count` int NOT NULL DEFAULT 0,
	`saves_count` int NOT NULL DEFAULT 0,
	`inquiries_count` int NOT NULL DEFAULT 0,
	`published_at` datetime(3),
	`expires_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`),
	CONSTRAINT `properties_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `property_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`kind` enum('view','contact_reveal','share') NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `property_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_media` (
	`id` varchar(36) NOT NULL,
	`property_id` varchar(36) NOT NULL,
	`kind` enum('image','video','floorplan') NOT NULL DEFAULT 'image',
	`storage_path` varchar(300),
	`external_url` text,
	`caption` varchar(200),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `property_media_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` varchar(36) NOT NULL,
	`reporter_id` varchar(36),
	`target_type` enum('property','user','message','review') NOT NULL,
	`target_id` varchar(36) NOT NULL,
	`reason` enum('scam','fake_listing','wrong_info','duplicate','already_sold','harassment','spam','other') NOT NULL,
	`details` text,
	`status` enum('open','investigating','resolved','dismissed') NOT NULL DEFAULT 'open',
	`handled_by` varchar(36),
	`resolution_note` text,
	`created_at` datetime(3) NOT NULL,
	`resolved_at` datetime(3),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` varchar(36) NOT NULL,
	`reviewer_id` varchar(36) NOT NULL,
	`target_type` enum('agent','seller','pod') NOT NULL,
	`target_id` varchar(36) NOT NULL,
	`rating` smallint NOT NULL,
	`body` text,
	`status` enum('published','hidden') NOT NULL DEFAULT 'published',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviews_unique` UNIQUE(`reviewer_id`,`target_type`,`target_id`)
);
--> statement-breakpoint
CREATE TABLE `saved_searches` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`filters` json NOT NULL,
	`notify` boolean NOT NULL DEFAULT true,
	`last_notified_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `saved_searches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`token` varchar(191) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `staff_members` (
	`user_id` varchar(36) NOT NULL,
	`role` enum('super_admin','moderator','verifier','support','finance') NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `staff_members_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`plan_id` varchar(40) NOT NULL,
	`status` enum('active','past_due','cancelled','expired') NOT NULL DEFAULT 'active',
	`current_period_start` datetime(3) NOT NULL,
	`current_period_end` datetime(3),
	`cancel_at_period_end` boolean NOT NULL DEFAULT false,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` varchar(36) NOT NULL,
	`role` enum('buyer','tenant','owner','investor','agent') NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `user_roles_user_id_role_pk` PRIMARY KEY(`user_id`,`role`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(191) NOT NULL,
	`value` text NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verification_documents` (
	`id` varchar(36) NOT NULL,
	`request_id` varchar(36) NOT NULL,
	`doc_type` varchar(30) NOT NULL,
	`storage_path` varchar(300) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `verification_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `verification_requests` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`kind` enum('identity','agent_license','property_ownership','company') NOT NULL,
	`property_id` varchar(36),
	`status` enum('pending','needs_info','approved','rejected') NOT NULL DEFAULT 'pending',
	`submitted_data` json NOT NULL,
	`reviewer_id` varchar(36),
	`reviewer_note` text,
	`submitted_at` datetime(3) NOT NULL,
	`reviewed_at` datetime(3),
	CONSTRAINT `verification_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `zones` (
	`id` varchar(36) NOT NULL,
	`slug` varchar(60) NOT NULL,
	`name_th` varchar(120) NOT NULL,
	`name_en` varchar(120),
	`icon` varchar(16),
	`description` text,
	`center_lat` decimal(9,6),
	`center_lng` decimal(9,6),
	`sort_order` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `zones_id` PRIMARY KEY(`id`),
	CONSTRAINT `zones_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `account_deletion_requests` ADD CONSTRAINT `account_deletion_requests_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_hub_id_hubs_id_fk` FOREIGN KEY (`hub_id`) REFERENCES `hubs`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_registrations` ADD CONSTRAINT `activity_registrations_activity_id_activities_id_fk` FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_registrations` ADD CONSTRAINT `activity_registrations_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_pods` ADD CONSTRAINT `agency_pods_zone_id_zones_id_fk` FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agency_pods` ADD CONSTRAINT `agency_pods_leader_id_profiles_id_fk` FOREIGN KEY (`leader_id`) REFERENCES `profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_profiles` ADD CONSTRAINT `agent_profiles_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_buyer_id_profiles_id_fk` FOREIGN KEY (`buyer_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_seller_id_profiles_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boosts` ADD CONSTRAINT `boosts_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boosts` ADD CONSTRAINT `boosts_product_id_boost_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `boost_products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boosts` ADD CONSTRAINT `boosts_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commission_access_requests` ADD CONSTRAINT `commission_access_requests_agent_id_profiles_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commission_access_requests` ADD CONSTRAINT `commission_access_requests_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commission_programs` ADD CONSTRAINT `commission_programs_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `consents` ADD CONSTRAINT `consents_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_participants` ADD CONSTRAINT `conversation_participants_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_participants` ADD CONSTRAINT `conversation_participants_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hub_properties` ADD CONSTRAINT `hub_properties_hub_id_hubs_id_fk` FOREIGN KEY (`hub_id`) REFERENCES `hubs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hub_properties` ADD CONSTRAINT `hub_properties_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `hubs` ADD CONSTRAINT `hubs_zone_id_zones_id_fk` FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inquiries` ADD CONSTRAINT `inquiries_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inquiries` ADD CONSTRAINT `inquiries_buyer_id_profiles_id_fk` FOREIGN KEY (`buyer_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inquiries` ADD CONSTRAINT `inquiries_seller_id_profiles_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_profiles_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `offers` ADD CONSTRAINT `offers_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `offers` ADD CONSTRAINT `offers_buyer_id_profiles_id_fk` FOREIGN KEY (`buyer_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `offers` ADD CONSTRAINT `offers_seller_id_profiles_id_fk` FOREIGN KEY (`seller_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_boost_product_id_boost_products_id_fk` FOREIGN KEY (`boost_product_id`) REFERENCES `boost_products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pod_members` ADD CONSTRAINT `pod_members_pod_id_agency_pods_id_fk` FOREIGN KEY (`pod_id`) REFERENCES `agency_pods`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pod_members` ADD CONSTRAINT `pod_members_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_id_user_id_fk` FOREIGN KEY (`id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_owner_id_profiles_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_agent_id_profiles_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_zone_id_zones_id_fk` FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_events` ADD CONSTRAINT `property_events_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_media` ADD CONSTRAINT `property_media_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_reviewer_id_profiles_id_fk` FOREIGN KEY (`reviewer_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_searches` ADD CONSTRAINT `saved_searches_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_members` ADD CONSTRAINT `staff_members_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_documents` ADD CONSTRAINT `verification_documents_request_id_verification_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `verification_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_requests` ADD CONSTRAINT `verification_requests_user_id_profiles_id_fk` FOREIGN KEY (`user_id`) REFERENCES `profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_requests` ADD CONSTRAINT `verification_requests_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `deletion_user_idx` ON `account_deletion_requests` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `activities_upcoming_idx` ON `activities` (`status`,`starts_at`);--> statement-breakpoint
CREATE INDEX `appointments_seller_idx` ON `appointments` (`seller_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `appointments_buyer_idx` ON `appointments` (`buyer_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `boosts_active_idx` ON `boosts` (`placement`,`ends_at`);--> statement-breakpoint
CREATE INDEX `commission_access_agent_idx` ON `commission_access_requests` (`agent_id`,`status`);--> statement-breakpoint
CREATE INDEX `commission_access_property_idx` ON `commission_access_requests` (`property_id`);--> statement-breakpoint
CREATE INDEX `consents_user_idx` ON `consents` (`user_id`,`kind`,`created_at`);--> statement-breakpoint
CREATE INDEX `participants_user_idx` ON `conversation_participants` (`user_id`);--> statement-breakpoint
CREATE INDEX `favorites_property_idx` ON `favorites` (`property_id`);--> statement-breakpoint
CREATE INDEX `inquiries_seller_idx` ON `inquiries` (`seller_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `inquiries_buyer_idx` ON `inquiries` (`buyer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `messages_conversation_idx` ON `messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_entity_idx` ON `notifications` (`user_id`,`entity_id`);--> statement-breakpoint
CREATE INDEX `offers_seller_idx` ON `offers` (`seller_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `offers_buyer_idx` ON `offers` (`buyer_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `orders_user_idx` ON `orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `pod_members_user_idx` ON `pod_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `profiles_status_idx` ON `profiles` (`status`);--> statement-breakpoint
CREATE INDEX `properties_status_idx` ON `properties` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `properties_owner_idx` ON `properties` (`owner_id`);--> statement-breakpoint
CREATE INDEX `properties_agent_idx` ON `properties` (`agent_id`);--> statement-breakpoint
CREATE INDEX `properties_zone_idx` ON `properties` (`zone_id`);--> statement-breakpoint
CREATE INDEX `properties_search_idx` ON `properties` (`status`,`category`,`listing_type`,`province`);--> statement-breakpoint
CREATE INDEX `properties_sale_idx` ON `properties` (`status`,`sale_price`);--> statement-breakpoint
CREATE INDEX `properties_rent_idx` ON `properties` (`status`,`rent_price`);--> statement-breakpoint
CREATE INDEX `properties_geo_idx` ON `properties` (`lat`,`lng`);--> statement-breakpoint
CREATE INDEX `properties_featured_idx` ON `properties` (`featured_until`);--> statement-breakpoint
CREATE INDEX `events_property_idx` ON `property_events` (`property_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `events_user_idx` ON `property_events` (`user_id`,`property_id`,`kind`);--> statement-breakpoint
CREATE INDEX `media_property_idx` ON `property_media` (`property_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `reports_queue_idx` ON `reports` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `reports_target_idx` ON `reports` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `reviews_target_idx` ON `reviews` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `saved_searches_user_idx` ON `saved_searches` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_user_idx` ON `subscriptions` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `verification_docs_request_idx` ON `verification_documents` (`request_id`);--> statement-breakpoint
CREATE INDEX `verification_queue_idx` ON `verification_requests` (`status`,`submitted_at`);--> statement-breakpoint
CREATE INDEX `verification_user_idx` ON `verification_requests` (`user_id`);