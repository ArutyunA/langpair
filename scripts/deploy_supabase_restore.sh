#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

: "${PROJECT_REF:?Set PROJECT_REF to the new Supabase project ref.}"
: "${DB_PASSWORD:?Set DB_PASSWORD to the new Supabase database password.}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY for the function secret.}"
: "${CORS_ALLOW_ORIGIN:?Set CORS_ALLOW_ORIGIN to the frontend origin that will call the function.}"

TTS_BUCKET="${TTS_BUCKET:-TTSCanto}"
SIGNED_URL_TTL="${SIGNED_URL_TTL:-300}"

supabase link \
  --project-ref "${PROJECT_REF}" \
  -p "${DB_PASSWORD}" \
  --workdir "${REPO_ROOT}"

supabase secrets set \
  --project-ref "${PROJECT_REF}" \
  --workdir "${REPO_ROOT}" \
  "TTS_BUCKET=${TTS_BUCKET}" \
  "SIGNED_URL_TTL=${SIGNED_URL_TTL}" \
  "CORS_ALLOW_ORIGIN=${CORS_ALLOW_ORIGIN}" \
  "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}"

supabase functions deploy super-service \
  --project-ref "${PROJECT_REF}" \
  --workdir "${REPO_ROOT}" \
  --use-api \
  --yes
