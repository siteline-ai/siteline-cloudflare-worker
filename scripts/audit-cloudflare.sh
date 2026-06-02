#!/usr/bin/env bash

set -u

WORKER_NAME="${WORKER_NAME:-siteline-cloudflare-worker}"

section() {
	printf '\n== %s ==\n' "$1"
}

run_or_note() {
	printf '$'
	for arg in "$@"; do
		printf ' %q' "$arg"
	done
	printf '\n'

	"$@"
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

section "Secrets"
run_or_note npx wrangler secret list --name "$WORKER_NAME"

section "Current Deployment"
run_or_note npx wrangler deployments status --name "$WORKER_NAME"

section "Recent Deployments"
run_or_note npx wrangler deployments list --name "$WORKER_NAME"

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
