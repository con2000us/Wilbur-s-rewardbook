# Database Setup Guide

This guide will help you set up the database for Wilbur's Reward Book.

## Required Migrations

Execute these SQL files in order in your Supabase SQL Editor:

1. **`add-site-settings.sql`** - Creates the site settings table
2. **`add-student-display-order.sql`** - Adds display_order to students table
3. **`add-subject-to-reward-rules.sql`** - Adds subject_id to reward_rules table
4. **`add-reward-rules-display-order.sql`** - Adds display_order to reward_rules table
5. **`add-reset-transaction-type.sql`** - Adds reset transaction type support
6. **`add-pagination-settings.sql`** - Adds pagination settings
7. **`add-backups-table.sql`** - Creates the backups table for backup storage

## Optional Files

- **`default-reward-rules.sql`** - Sample reward rules (optional, for testing)

## Notes

- All migration files use `IF NOT EXISTS` or `IF EXISTS` checks, so they are safe to run multiple times
- Make sure to run migrations in the order listed above
- After running migrations, you can start using the application

