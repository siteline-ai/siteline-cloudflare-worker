import { TrackingError } from './errors';
import { trackMCPRequest } from './mcp-tracking';
import type { Env } from './types';

export const SitelineMCPWorker = {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const requestForTracking = request.clone();

		const startedAt = performance.now();
		const response = await fetch(request);

		ctx.waitUntil(
			trackMCPRequest(
				requestForTracking,
				response,
				performance.now() - startedAt,
				env
			).catch((error) => {
				if (error instanceof TrackingError) {
					console.error(`[Siteline] ${error.message}:`, error.cause);
				} else {
					console.error('[Siteline] Unexpected error:', error);
				}
			})
		);

		return response;
	},
} satisfies ExportedHandler<Env>;
