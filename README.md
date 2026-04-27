# LoadLog

LoadLog is an Expo + Supabase workout planner and logger. Users sign in with `username + password`, generate a weekly plan, log workouts, track streaks, and review workout history.

## Shared Supabase Project Setup

This repo is set up for a single shared Supabase project.

Only one maintainer needs to configure Supabase. Everyone else can pull the repo, add the shared client env vars, and run the app locally.

### What teammates need from the shared project

Share these two values privately with collaborators:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

These are client-side values and are safe to use in the app.

Do not share the Supabase `service_role` key.

## One-Time Maintainer Setup

If you are the person managing the shared Supabase project:

1. Run the schema in Supabase SQL Editor:
   - [scripts/supabase_schema.sql](scripts/supabase_schema.sql)
   - If the project ever used an older version of the schema, run the script again to pick up the latest RLS policy updates.

2. Configure Supabase Auth:
   - `Authentication -> Sign In / Providers -> Email`
   - Enable the Email provider
   - Disable `Confirm email`
   - Make sure new-user signup is allowed

3. Share the project URL and publishable key with teammates.

This app uses Supabase email auth behind the scenes with an internal email derived from the username, so `Confirm email` must stay off for signup to work.

## Teammate Setup

1. Clone the repo:

   ```bash
   git clone <your-repo-url>
   cd LoadLog
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env.local` in the project root.

   You can copy from `.env.example` and fill in the shared values:

   ```bash
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   ```

4. Start the app:

   ```bash
   npm run start
   ```

5. Sign up or sign in with `username + password`.

## Verification

Before pushing, it is a good idea to verify the project still runs cleanly:

```bash
npm run lint
npx vitest run tests/planner.test.ts
```

## Notes

- `.env.local` is intentionally not committed.
- Because everyone uses the same Supabase project, all users will consume the same backend quota.
- Row Level Security is enabled, so users should only be able to access their own app data.
