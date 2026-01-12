import { track } from './tracking';
import { TrackingError } from './errors';
import { Env } from './types';

export const SitelineWorker = {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {
		const startedAt = performance.now();
		const response = await fetch(request);

		ctx.waitUntil(
			track(request, response.status, performance.now() - startedAt, env)
				.catch((error) => {
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
