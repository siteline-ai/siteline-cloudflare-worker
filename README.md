# Siteline Cloudflare Worker

Automatically track AI bot visits (ChatGPT, Claude, Perplexity, etc.) on your website with zero performance impact.

This Worker is intended to run on Cloudflare **Worker Routes** in front of an existing origin. Do not deploy it as a Worker Custom Domain unless that mode has been explicitly tested for your site.

## Prerequisites
- Cloudflare account
- Node.js installed
- Your Siteline website key

## Installation

1. **Clone and install dependencies**
   ```bash
   npm install
   ```

2. **Login to Cloudflare**
   ```bash
   npx wrangler login
   ```

3. **Set your Siteline website key** (secure, never committed to code)
   ```bash
   npx wrangler secret put SITELINE_WEBSITE_KEY
   ```
   When prompted, paste your website key and press Enter.

4. **Deploy the worker**
   ```bash
   npm run deploy
   ```

5. **Configure routes in Cloudflare Dashboard**
	- Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
	- Navigate to: **Workers & Pages** > **siteline-cloudflare-worker** > **Settings** > **Domain & Routes**
	- Click **Add** > **Route**
	- Add your domain pattern, for example:
		- `example.com/*` (tracks all pages for domain)
		- `*example.com/*` (tracks all subdomains)
	- Select your zone and save

Use Worker Routes, not Worker Custom Domains. Routes run the Worker in front of an existing proxied origin, which is the deployment mode this integration expects.

## What Gets Tracked

The worker automatically detects and tracks visits from:
- ChatGPT (OpenAI)
- Claude (Anthropic)
- Perplexity
- Google Gemini
- Other AI search agents

Static assets (images, CSS, JS, fonts, media, archives, `favicon.ico`, `robots.txt`, and `sitemap.xml`) are automatically excluded from Siteline tracking. The Worker still proxies those requests when your Cloudflare route matches them. To reduce Cloudflare Worker invocations, scope your Worker Routes to the hostnames and paths you actually want to measure.

## Cloudflare Artifacts Created

Installing this integration can create or update:

- Worker service: `siteline-cloudflare-worker`
- Encrypted Worker secret: `SITELINE_WEBSITE_KEY`
- Worker deployments and versions
- Worker Routes under **Domain & Routes**
- Persisted Worker observability logs and traces sampled at `0.01`
- Optional proxied DNS records if you are placing Cloudflare in front of a hosted website builder

## Configuration

### Update the worker
After making changes to the code:
```bash
npm run deploy
```

### Audit Cloudflare state
This read-only helper lists the Worker name, secrets, deployments, rollback command shape, dry-run delete command, and manual route cleanup checklist:
```bash
npm run audit:cloudflare
```

### View logs
```bash
npx wrangler tail
```

Observability persistence is enabled at a low `0.01` sampling rate in `wrangler.jsonc`.

## Rollback

List recent deployments:

```bash
npx wrangler deployments list
```

Choose a previous version id, then roll back:

```bash
npx wrangler rollback <version-id> --name siteline-cloudflare-worker
```

## Uninstall

1. In Cloudflare Dashboard, open **Workers & Pages** > **siteline-cloudflare-worker** > **Settings** > **Domain & Routes**.
2. Remove every Worker Route created for this integration.
3. Visit or `curl` the affected hostname/path and verify it still reaches your origin without the Worker.
4. Optionally delete the Siteline secret:
   ```bash
   npx wrangler secret delete SITELINE_WEBSITE_KEY --name siteline-cloudflare-worker
   ```
5. Dry-run Worker deletion:
   ```bash
   npx wrangler delete siteline-cloudflare-worker --dry-run
   ```
6. Delete the Worker only after routes are removed and origin traffic is verified.

## How It Works

The worker runs as middleware on your domain:
1. Receives incoming request
2. Forwards request immediately (zero latency impact)
3. Skips Siteline tracking for static assets
4. Sends tracking data to Siteline in the background for content requests
5. Returns response to visitor

## Troubleshooting

**Worker not tracking visits?**
- Verify Worker Routes are configured in Cloudflare Dashboard
- Check your website key is set: `npx wrangler secret list`
- View real-time logs: `npx wrangler tail`

**Need to change your website key?**
```bash
npx wrangler secret put SITELINE_WEBSITE_KEY
```

## Documentation

- [Full Documentation](https://docs.gptrends.io/integrations/cloudflare)
- [GitHub Repository](https://github.com/siteline-ai/siteline-cloudflare-worker)

## Support

- [GitHub Issues](https://github.com/siteline-ai/siteline-cloudflare-worker/issues)
- Email: team@siteline.ai
