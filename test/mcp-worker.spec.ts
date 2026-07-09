import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/types';

vi.mock('../src/mcp-tracking', () => ({
	trackMCPRequest: vi.fn().mockResolvedValue(undefined),
}));

import mcpWorker from '../src/mcp-index';
import { trackMCPRequest } from '../src/mcp-tracking';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

const testEnv: Env = {
	SITELINE_WEBSITE_KEY: 'siteline_secret_' + '0'.repeat(32),
};

describe('Siteline MCP worker', () => {
	beforeEach(() => {
		vi.mocked(trackMCPRequest).mockClear();
	});

	it('tracks configured MCP routes', async () => {
		const request = new IncomingRequest('http://example.com/mcp', {
			method: 'POST',
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: '1',
				method: 'tools/call',
				params: { name: 'search_docs' },
			}),
		});
		const ctx = createExecutionContext();

		const response = await mcpWorker.fetch(request, testEnv, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBeDefined();
		expect(trackMCPRequest).toHaveBeenCalledTimes(1);
	});

	it('tracks all requests routed to the MCP worker', async () => {
		const request = new IncomingRequest('http://example.com/about', {
			method: 'POST',
		});
		const ctx = createExecutionContext();

		const response = await mcpWorker.fetch(request, testEnv, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBeDefined();
		expect(trackMCPRequest).toHaveBeenCalledTimes(1);
	});
});
