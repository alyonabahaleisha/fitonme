-- Add day_pass to the plan_type enum
-- We attempt to add it to the enum type first
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type JOIN pg_enum ON pg_type.oid = pg_enum.enumtypid WHERE typname = 'plan_type' AND enumlabel = 'day_pass') THEN
        ALTER TYPE plan_type ADD VALUE 'day_pass';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- If it fails (e.g. not an enum but a check constraint), ignore and try check constraint
        RAISE NOTICE 'Could not alter enum, might be a check constraint';
END $$;

-- Update check constraint on users table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_plan_type_check') THEN
        ALTER TABLE users DROP CONSTRAINT users_plan_type_check;
        ALTER TABLE users ADD CONSTRAINT users_plan_type_check CHECK (plan_type IN ('free', 'weekly', 'monthly', 'annual', 'day_pass'));
    END IF;
END $$;

-- Update check constraint on subscriptions table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subscriptions_plan_check') THEN
        ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_plan_check;
        ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_plan_check CHECK (plan IN ('weekly', 'monthly', 'annual', 'day_pass'));
    END IF;
END $$;
