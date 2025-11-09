# Supabase Database Setup

This directory contains the database schema and migration files for the FitOnMe application.

## Database Schema

The database consists of three main tables:

1. **users** - Stores user profile and subscription data
2. **subscriptions** - Tracks active subscriptions (synced with Stripe)
3. **try_on_history** - Records all try-on attempts for analytics

## Setup Instructions

### 1. Apply the Schema

To set up the database, you need to run the SQL migration in your Supabase project:

#### Option A: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `supabase/schema.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** to execute

#### Option B: Supabase CLI

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Run the migration
supabase db push
```

### 2. Enable Google OAuth

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Enable **Google** provider
3. Configure with your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Add authorized redirect URLs:
   - `http://localhost:5173/auth/callback` (development)
   - `https://your-domain.com/auth/callback` (production)

### 3. Configure Magic Link Email

Magic Link authentication is enabled by default in Supabase. To customize:

1. Go to **Authentication** → **Email Templates**
2. Customize the **Magic Link** template if desired
3. Configure SMTP settings in **Project Settings** → **Auth** (optional)

### 4. Set Up Stripe Webhooks (Coming Soon)

After setting up Stripe, you'll need to configure webhooks to sync subscriptions:

1. Create webhook endpoint in your backend: `/api/stripe/webhook`
2. Add webhook URL in Stripe Dashboard
3. Listen for these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

## Database Functions

The schema includes several helper functions:

### `check_user_credits(user_uuid UUID)`
Returns `TRUE` if the user has available credits or an active subscription.

```sql
SELECT check_user_credits('user-uuid-here');
```

### `decrement_user_credits(user_uuid UUID)`
Decrements the user's credits after a try-on. Returns `TRUE` on success.

```sql
SELECT decrement_user_credits('user-uuid-here');
```

### `handle_new_user()`
Automatically triggered when a new user signs up via Supabase Auth.
Creates a corresponding row in the `users` table.

## Row Level Security (RLS)

All tables have Row Level Security enabled:

- **Users** can only read/update their own data
- **Subscriptions** are managed by webhooks (service role)
- **Try-on history** is user-scoped

## Testing the Setup

After running the migration, verify it worked:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'subscriptions', 'try_on_history');

-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%';
```

## Environment Variables

Make sure these are set in your `.env` file:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Next Steps

1. Run the schema migration
2. Enable Google OAuth provider
3. Test authentication flow
4. Set up Stripe account and webhooks
5. Test subscription flow

## Troubleshooting

### Error: "relation already exists"
If you see this error, the tables already exist. You can either:
- Drop existing tables: `DROP TABLE IF EXISTS users, subscriptions, try_on_history CASCADE;`
- Or modify the SQL to use `CREATE TABLE IF NOT EXISTS` (already included)

### Error: "function already exists"
Similar to tables, you can drop functions first:
```sql
DROP FUNCTION IF EXISTS check_user_credits CASCADE;
DROP FUNCTION IF EXISTS decrement_user_credits CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
```

### RLS Blocking Queries
If you're testing with service role key, RLS is bypassed. With anon key, ensure policies are correct or temporarily disable RLS for testing:
```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```
