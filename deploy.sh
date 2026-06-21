#!/usr/bin/env bash
#
# Deploy the combined CodeBud image to Google Cloud Run.
# Requires: gcloud CLI authenticated (`gcloud auth login`).
#
# Quick demo deploy (mock AI, only the DB is required):
#   MONGODB_URI='mongodb+srv://...' ./deploy.sh
#
# Real AI deploy:
#   AI_PROVIDER=anthropic ANTHROPIC_API_KEY='sk-ant-...' MONGODB_URI='mongodb+srv://...' ./deploy.sh
#
# Optional overrides: PROJECT_ID, REGION, SERVICE, JWT_SECRET, ANTHROPIC_MODEL
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-gen-lang-client-0536773966}"   # the "Demos" project
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-codebud}"
AI_PROVIDER="${AI_PROVIDER:-mock}"
ANTHROPIC_MODEL="${ANTHROPIC_MODEL:-claude-opus-4-8}"

: "${MONGODB_URI:?Set MONGODB_URI (MongoDB Atlas connection string)}"

# Auto-generate a JWT secret if none provided (note: regenerating invalidates sessions).
if [[ -z "${JWT_SECRET:-}" ]]; then
  JWT_SECRET="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | base64)"
  echo "→ No JWT_SECRET provided; generated a random one for this deploy."
fi

echo "→ Project: $PROJECT_ID   Region: $REGION   Service: $SERVICE   AI: $AI_PROVIDER"

gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com

# Create-or-update a secret (idempotent).
upsert_secret() {
  local name="$1" value="$2"
  if gcloud secrets describe "$name" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=-
  else
    printf '%s' "$value" | gcloud secrets create "$name" --data-file=-
  fi
}

upsert_secret MONGODB_URI "$MONGODB_URI"
upsert_secret JWT_SECRET  "$JWT_SECRET"
SECRETS="MONGODB_URI=MONGODB_URI:latest,JWT_SECRET=JWT_SECRET:latest"
ENVVARS="NODE_ENV=production,AI_PROVIDER=${AI_PROVIDER}"

if [[ "$AI_PROVIDER" == "anthropic" ]]; then
  : "${ANTHROPIC_API_KEY:?AI_PROVIDER=anthropic requires ANTHROPIC_API_KEY}"
  upsert_secret ANTHROPIC_API_KEY "$ANTHROPIC_API_KEY"
  SECRETS="${SECRETS},ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest"
  ENVVARS="${ENVVARS},ANTHROPIC_MODEL=${ANTHROPIC_MODEL}"
fi

# Build from source (Cloud Build) and deploy — no local Docker needed.
gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --session-affinity \
  --set-env-vars "$ENVVARS" \
  --set-secrets "$SECRETS"

URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
echo "→ Deployed: $URL"
echo "→ Setting CLIENT_ORIGIN=$URL and redeploying env..."
gcloud run services update "$SERVICE" --region "$REGION" --set-env-vars "CLIENT_ORIGIN=${URL}"
echo "✓ Done: $URL"
