-- Initial schema: people, chores, and chore_assignments

CREATE TYPE role AS ENUM ('Admin', 'Child');

CREATE TYPE recurrence AS ENUM ('Daily', 'Weekly', 'Biweekly', 'Monthly', 'Custom');

CREATE TYPE assignment_status AS ENUM ('Pending', 'Completed', 'Verified', 'Skipped');

CREATE TABLE people (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    role        role        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chores (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT        NOT NULL,
    value_cents BIGINT      NOT NULL DEFAULT 0,
    recurrence  recurrence  NULL,
    -- For Custom recurrence, stores the cron expression
    recurrence_custom TEXT  NULL,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chore_assignments (
    id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    chore_id     UUID              NOT NULL REFERENCES chores(id),
    person_id    UUID              NOT NULL REFERENCES people(id),
    assigned_by  UUID              NULL REFERENCES people(id),
    status       assignment_status NOT NULL DEFAULT 'Pending',
    due_at       TIMESTAMPTZ       NULL,
    completed_at TIMESTAMPTZ       NULL,
    created_at   TIMESTAMPTZ       NOT NULL DEFAULT now()
);
