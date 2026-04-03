-- Replace the two-column recurrence model (enum discriminant + custom text)
-- with a single nullable cron expression column.
-- Named variants map to canonical cron strings at the application layer.

ALTER TABLE chores DROP COLUMN recurrence;
ALTER TABLE chores DROP COLUMN recurrence_custom;
DROP TYPE recurrence;

ALTER TABLE chores ADD COLUMN recurrence_cron TEXT NULL;
