# Migration: SQLite → Supabase (PostgreSQL)

This guide walks you through migrating the Unit Rate app from SQLite to Supabase (PostgreSQL) for Vercel deployment.

## Prerequisites

- Node.js 18+
- A Supabase account (free tier works)

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Choose organization, set project name and database password (save the password)
4. Select a region close to your users
5. Click **Create new project** and wait for setup to complete

## Step 2: Get Connection Strings

1. In Supabase Dashboard, go to **Project Settings** (gear icon) → **Database**
2. Find **Connection string** section
3. Copy the **URI** connection string (Transaction mode)
4. You need two URLs:

   - **DATABASE_URL** (pooled, port 6543): Use for app runtime  
     - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`
   
   - **DIRECT_URL** (direct, port 5432): Use for Prisma migrations  
     - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`

5. For Supabase client (optional): **Project Settings** → **API**
   - Project URL → `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Step 3: Configure Environment

1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and paste your connection strings:
   ```env
   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
   ```

3. Replace `[password]` with your database password (URL-encode special chars if any)

## Step 4: Run Migrations

**Note:** Existing migrations in `prisma/migrations/` were created for SQLite. For a fresh PostgreSQL/Supabase database, use one of these approaches:

### Option A: Push schema (quick start)
```bash
npx prisma db push
```
This applies the schema directly without migration history. Good for new projects.

### Option B: Create fresh PostgreSQL migration
```bash
npx prisma migrate dev --name init_postgres
```
This generates a new migration from the current schema for PostgreSQL.

### Option C: Production deploy
```bash
npx prisma generate
npx prisma migrate deploy
```
Or use the npm script:
```bash
npm run db:migrate:deploy
```
Requires migrations to exist and match the schema.

## Step 5: Seed Database

Required (base currency needed for new projects):

```bash
npx prisma db seed
```

## Step 6: Migrate Existing SQLite Data (Optional)

If you have existing projects in SQLite (`data/projects/`):

```bash
npm run migrate:sqlite-to-supabase
```

This reads each project's SQLite file and imports data into Supabase, then updates the registry.

## Step 7: Verify Locally

1. Run the app:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. Optionally open Prisma Studio to inspect data:
   ```bash
   npx prisma studio
   ```

## Troubleshooting

- **Connection refused**: Ensure `DATABASE_URL` and `DIRECT_URL` use the correct ports (6543 for pooled, 5432 for direct)
- **SSL required**: Supabase requires SSL. Add `?sslmode=require` to URLs if needed
- **Migration fails**: Ensure `DIRECT_URL` is used for migrations (bypasses pgbouncer)
- **Prisma client outdated**: Run `npx prisma generate` after schema changes
