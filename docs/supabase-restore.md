# Supabase Restore Runbook

This project already contains the paused project backup artifacts:

- Database dump: `../backups/source-project-ref/db_cluster-27-11-2025@22-15-07.backup`
- Storage objects: `../backups/source-project-ref/TTSCanto/`

The original Supabase project metadata recovered from the CLI is:

- Old project ref: `source-project-ref`
- Old region: `eu-north-1`
- Old org id: `source-org-id`

## 1. Create the replacement hosted project

You can create it from the dashboard or the CLI. The CLI form is:

```bash
supabase projects create "LangPair Restored" \
  --org-id source-org-id \
  --region eu-north-1 \
  --db-password '<choose-a-strong-password>'
```

Then capture:

- Project ref
- Project URL
- Publishable / anon key
- Service role key
- Database password
- Session pooler or direct database connection string

## 2. Rewrite local project wiring

Run:

```bash
python3 scripts/update_supabase_project_config.py \
  --project-ref '<new-project-ref>' \
  --project-url 'https://<new-project-ref>.supabase.co' \
  --publishable-key '<new-publishable-key>'
```

This updates:

- `.env`
- `supabase/config.toml`

## 3. Restore the database dump

Set the new connection string and run:

```bash
export SUPABASE_DB_URL='postgresql://postgres.<ref>:<password>@aws-...pooler.supabase.com:5432/postgres'
python3 scripts/restore_dashboard_backup.py
```

Notes:

- `psql` 18.0 is installed locally.
- Do not enable `ON_ERROR_STOP`.
- `already exists` errors are expected with Supabase full dashboard dumps.

## 4. Upload Storage objects

Use the service role key from the new project:

```bash
export SUPABASE_URL='https://<new-project-ref>.supabase.co'
export SUPABASE_SERVICE_ROLE_KEY='<new-service-role-key>'
node scripts/upload_storage_backup.mjs
```

By default this uploads every file under `../backups/source-project-ref/TTSCanto/` into the `TTSCanto` bucket while preserving paths like `bethany/day44/...`.

## 5. Redeploy the Edge Function

```bash
export PROJECT_REF='<new-project-ref>'
export DB_PASSWORD='<new-db-password>'
export SUPABASE_SERVICE_ROLE_KEY='<new-service-role-key>'
export CORS_ALLOW_ORIGIN='https://<your-frontend-origin>'
bash scripts/deploy_supabase_restore.sh
```

Defaults applied by the deploy wrapper:

- `TTS_BUCKET=TTSCanto`
- `SIGNED_URL_TTL=300`

## 6. Verify

Run the app with the rewritten `.env` and confirm:

- Email/password sign-in works
- `public.profiles`, `public.daily_vocabulary`, and `public.daily_scenarios` are populated
- The `TTSCanto` bucket exists and contains uploaded files
- Audio playback works from a restored scenario or vocabulary item
- The `super-service` function returns signed URLs for known storage paths
