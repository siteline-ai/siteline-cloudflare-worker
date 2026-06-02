import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/types';

vi.mock('../src/tracking', () => ({
	track: vi.fn().mockResolvedValue(undefined),
}));

import worker from '../src/index';
import { track } from '../src/tracking';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;
const testEnv: Env = {
	SITELINE_API_URL: 'https://api.siteline.ai/v1/intake/pageview',
	SITELINE_WEBSITE_KEY: 'siteline_secret_' + '0'.repeat(32),
};

describe('Siteline worker request filtering', () => {
	beforeEach(() => {
		vi.mocked(track).mockClear();
	});

	it('proxies static assets without scheduling tracking', async () => {
		const request = new IncomingRequest('http://example.com/style.css');
		const ctx = createExecutionContext();

		const response = await worker.fetch(
			request,
			testEnv,
			ctx
		);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBeDefined();
		expect(track).not.toHaveBeenCalled();
	});

	it('proxies content pages and schedules tracking', async () => {
		const request = new IncomingRequest('http://example.com/about');
		const ctx = createExecutionContext();

		const response = await worker.fetch(
			request,
			testEnv,
			ctx
		);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBeDefined();
		expect(track).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith(
			request,
			response.status,
			expect.any(Number),
			expect.objectContaining({ SITELINE_WEBSITE_KEY: expect.any(String) })
		);
	});
});
