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

const SKIP_PATTERN = /\.(css|js|jpe?g|png|gif|svg|webp|ico|woff2?|ttf|mp4|webm)$/i;

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const start = Date.now();
		const response = await fetch(request);

		if (shouldTrack(request)) {
			ctx.waitUntil(track(request, response.status, Date.now() - start, env));
		}

		return response;
	}
} satisfies ExportedHandler<Env>;

function shouldTrack(req: Request): boolean {
	const { method, url } = req;
	return (method === 'GET' || method === 'POST') && !SKIP_PATTERN.test(url);
}

async function track(req: Request, status: number, time: number, env: Env): Promise<void> {
	try {
		await fetch(env.GPTRENDS_API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				url: req.url,
				method: req.method,
				userAgent: req.headers.get('user-agent') || '',
				ref: req.headers.get('referer') || '',
				ip: req.headers.get('cf-connecting-ip') || '',
				status,
				time,
				websiteKey: env.GPTRENDS_WEBSITE_KEY,
				integration_type: 'cloudflare-worker',
				sdk: 'gptrends-cloudflare-worker',
				sdk_version: '1.0.0',
			}),
			signal: AbortSignal.timeout(5000)
		}).catch(() => {});
	} catch {}
}
