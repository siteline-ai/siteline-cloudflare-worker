#!/usr/bin/env bash

set -u

WORKER_NAME="${WORKER_NAME:-siteline-cloudflare-worker}"
REMOTE_AUDIT_AVAILABLE=false

section() {
	printf '\n== %s ==\n' "$1"
}

wrangler() {
	CI=true npx wrangler "$@"
}

run_or_note() {
	printf '$'
	printf ' CI=true'
	for arg in npx wrangler "$@"; do
		printf ' %q' "$arg"
	done
	printf '\n'

	wrangler "$@"
	local status=$?
	if [ "$status" -ne 0 ]; then
		printf 'Command exited with %s. Check Wrangler login, account access, and selected Cloudflare account.\n' "$status"
	fi

	return 0
}

section "Worker"
printf 'Name: %s\n' "$WORKER_NAME"
printf 'Config: wrangler.jsonc\n'
printf 'workers.dev exposure: disabled in wrangler.jsonc via "workers_dev": false\n'

section "Cloudflare Auth"
if wrangler whoami --json >/dev/null 2>&1; then
	REMOTE_AUDIT_AVAILABLE=true
	printf 'Wrangler authentication is available. Remote audit sections will run in non-interactive mode.\n'
else
	printf 'Wrangler is not authenticated, or the cached auth token is invalid.\n'
	printf 'Remote audit sections are skipped so this script does not open an OAuth browser flow.\n'
	printf '\nTo fix OAuth auth locally:\n'
	printf '  npx wrangler logout\n'
	printf '  npx wrangler login\n'
	printf '\nFor non-interactive use, set a Cloudflare API token first:\n'
	printf '  export CLOUDFLARE_API_TOKEN=<token>\n'
fi

section "Secrets"
if [ "$REMOTE_AUDIT_AVAILABLE" = true ]; then
	run_or_note secret list --name "$WORKER_NAME"
else
	printf 'Skipped: Wrangler authentication is unavailable.\n'
fi

section "Current Deployment"
if [ "$REMOTE_AUDIT_AVAILABLE" = true ]; then
	run_or_note deployments status --name "$WORKER_NAME"
else
	printf 'Skipped: Wrangler authentication is unavailable.\n'
fi

section "Recent Deployments"
if [ "$REMOTE_AUDIT_AVAILABLE" = true ]; then
	run_or_note deployments list --name "$WORKER_NAME"
else
	printf 'Skipped: Wrangler authentication is unavailable.\n'
fi

section "Rollback"
printf 'Pick a previous version id from the deployments list, then run:\n'
printf 'npx wrangler rollback <version-id> --name %s\n' "$WORKER_NAME"

section "Uninstall Checklist"
printf '1. In Cloudflare Dashboard, open Workers & Pages > %s > Settings > Domain & Routes.\n' "$WORKER_NAME"
printf '2. Remove every Worker Route created for this integration.\n'
printf '3. Verify the affected hostname/path still reaches your origin without the Worker.\n'
printf '4. Optional secret cleanup: npx wrangler secret delete SITELINE_WEBSITE_KEY --name %s\n' "$WORKER_NAME"
printf '5. Dry-run Worker deletion: npx wrangler delete %s --dry-run\n' "$WORKER_NAME"
printf '6. Delete the Worker only after routes are removed and origin traffic is verified.\n'

section "Route Guardrail"
printf 'Use Worker Routes for this integration. Do not use Worker Custom Domains unless that deployment mode has been explicitly tested for the site.\n'
