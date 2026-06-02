import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/tracking', () => ({
	track: vi.fn().mockResolvedValue(undefined),
}));

import worker from '../src/index';
import { track } from '../src/tracking';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Siteline worker request filtering', () => {
	beforeEach(() => {
		vi.mocked(track).mockClear();
	});

	it('proxies static assets without scheduling tracking', async () => {
		const request = new IncomingRequest('http://example.com/style.css');
		const ctx = createExecutionContext();

		const response = await worker.fetch(
			request,
			{ SITELINE_WEBSITE_KEY: 'siteline_secret_' + '0'.repeat(32) },
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
			{ SITELINE_WEBSITE_KEY: 'siteline_secret_' + '0'.repeat(32) },
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
