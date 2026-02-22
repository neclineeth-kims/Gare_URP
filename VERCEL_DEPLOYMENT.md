# Vercel Deployment

Deploy the Unit Rate app to Vercel with Supabase (PostgreSQL) as the database.

## Environment Variables

Set these in **Vercel Dashboard** → **Project** → **Settings** → **Environment Variables**:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Pooled PostgreSQL URL (port 6543, pgbouncer) | Yes |
| `DIRECT_URL` | Direct PostgreSQL URL (port 5432) for migrations | Yes |
| `SUPABASE_URL` | Supabase project URL (if using Supabase client) | Optional |
| `SUPABASE_ANON_KEY` | Supabase anon key (if using Supabase client) | Optional |

### Getting the URLs

1. **Supabase Dashboard** → Project Settings → Database
2. Use **Connection string** → **URI** (Transaction mode)
3. **DATABASE_URL**: Use the pooled connection (port **6543**) with `?pgbouncer=true`
4. **DIRECT_URL**: Use the direct connection (port **5432**) for migrations

Example format:
```
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

## Build Settings

- **Build Command**: `next build` (default) or `prisma generate && next build`
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

If Prisma client needs to be generated at build time, set:
```
Build Command: npx prisma generate && next build
```

Or add a `postinstall` script in `package.json`:
```json
"scripts": {
  "postinstall": "prisma generate"
}
```

## Database Migrations

Run migrations **before** or **at** deploy:

### Option A: Run before deploy (recommended)
```bash
npx prisma migrate deploy
```

### Option B: Vercel Build Command
Add to build command:
```
npx prisma migrate deploy && next build
```

Note: `migrate deploy` runs migrations. Ensure `DIRECT_URL` is set in Vercel env vars.

## Connection Pooling

- Use **DATABASE_URL** with port 6543 (Supabase pooler) for serverless functions
- Avoid opening many connections; Supabase pooler handles concurrency
- Do not use `DIRECT_URL` for app runtime in production—it bypasses pooling

## Deploy

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

Vercel will run the build and deploy. The app uses `DATABASE_URL` at runtime.
