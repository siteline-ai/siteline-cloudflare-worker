/**
 * Cloudflare Worker for GPTrends Bot Tracking
 *
 * Automatically tracks AI bot visits (ChatGPT, Claude, etc.) by forwarding
 * request data to GPTrends API. Runs as middleware with zero impact on response time.
 */

export interface Env {
	GPTRENDS_WEBSITE_KEY: string;
	GPTRENDS_API_URL: string;
}

const SKIP_PATTERN = /\.(css|js|jpe?g|png|gif|svg|webp|ico|woff2?|ttf|mp4|webm|pdf|zip|tar|gz)$/i;
const SKIP_PATHS = ['/favicon.ico', '/robots.txt', '/sitemap.xml'];

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const startedAt = performance.now();

		const response = await fetch(request);

		if (shouldTrack(request)) {
			const duration = performance.now() - startedAt;
			ctx.waitUntil(
				track(request, response.status, duration, env)
			);
		}

		return response;
	}
} satisfies ExportedHandler<Env>;

function shouldTrack(req: Request): boolean {
	const { method, url } = req;
	if (method !== 'GET' && method !== 'POST') {
		return false;
	}

	const urlObj = new URL(url);
	return !SKIP_PATHS.includes(urlObj.pathname) && !SKIP_PATTERN.test(urlObj.pathname);
}

async function track(req: Request, status: number, duration: number, env: Env): Promise<void> {
	if (!env.GPTRENDS_API_URL || !env.GPTRENDS_WEBSITE_KEY) {
		console.error('GPTrends: Missing required environment variables');
		return;
	}

	try {
		await fetch(env.GPTRENDS_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				url: req.url,
				method: req.method,
				userAgent: req.headers.get('user-agent') || '',
				ref: req.headers.get('referer') || '',
				ip: req.headers.get('cf-connecting-ip') || '',
				status,
				duration: Math.round(duration),
				websiteKey: env.GPTRENDS_WEBSITE_KEY,
				integration_type: 'cloudflare-worker',
				sdk: 'gptrends-cloudflare-worker',
				sdk_version: '1.1.0',
			}),
			signal: AbortSignal.timeout(5000)
		});
	} catch (error) {
		console.error('GPTrends tracking failed:', error);
	}
}
