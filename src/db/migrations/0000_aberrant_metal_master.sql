CREATE TABLE `incident_events` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`event_type` text NOT NULL,
	`actor_id` text,
	`message` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `incidents` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`team_id` text NOT NULL,
	`severity` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`source` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`acknowledged_at` integer,
	`acknowledged_by` text,
	`resolved_at` integer,
	`resolved_by` text,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_incidents_org_status` ON `incidents` (`org_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text,
	`display_name` text NOT NULL,
	`slack_user_id` text,
	`ntfy_topic` text,
	`push_token` text,
	`role` text DEFAULT 'member' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_members_org_team` ON `members` (`org_id`,`team_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`incident_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`error_message` text,
	`sent_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`incident_id`) REFERENCES `incidents`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_incident` ON `notifications` (`incident_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`max_teams` integer DEFAULT 5,
	`max_members_per_team` integer DEFAULT 20,
	`max_alerts_per_month` integer DEFAULT 500,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_slug_unique` ON `organizations` (`slug`);--> statement-breakpoint
CREATE TABLE `schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`team_id` text NOT NULL,
	`member_id` text NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_schedules_org_team` ON `schedules` (`org_id`,`team_id`,`start_time`,`end_time`);--> statement-breakpoint
CREATE TABLE `slack_installations` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`slack_team_id` text NOT NULL,
	`slack_team_name` text,
	`bot_token` text NOT NULL,
	`bot_user_id` text,
	`signing_secret` text NOT NULL,
	`installed_by` text,
	`installed_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_slack_installations_org_team` ON `slack_installations` (`org_id`,`slack_team_id`);--> statement-breakpoint
CREATE INDEX `idx_slack_installations_team` ON `slack_installations` (`slack_team_id`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`slack_channel_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_teams_org_slug` ON `teams` (`org_id`,`slug`);--> statement-breakpoint
CREATE TABLE `webhook_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`org_id` text NOT NULL,
	`team_id` text NOT NULL,
	`name` text NOT NULL,
	`source_type` text NOT NULL,
	`secret` text NOT NULL,
	`severity_default` text DEFAULT 'warning' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action
);
