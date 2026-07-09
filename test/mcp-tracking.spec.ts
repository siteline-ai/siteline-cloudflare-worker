import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Siteline } from '@siteline/core';
import type { Env } from '../src/types';
import { trackMCPRequest } from '../src/mcp-tracking';

vi.mock('@siteline/core', () => ({
	Siteline: vi.fn(),
}));

function mockSitelineClient(mockTrack: ReturnType<typeof vi.fn>) {
	vi.mocked(Siteline).mockImplementation(function () {
		return { track: mockTrack } as any;
	} as any);
}

describe('trackMCPRequest', () => {
	const env: Env = {
		SITELINE_WEBSITE_KEY: 'siteline_secret_' + '0'.repeat(32),
		SITELINE_MCP_CAPTURE_ARG_KEYS: 'true',
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('tracks MCP tools/call payload with isMcp flag', async () => {
		const mockTrack = vi.fn().mockResolvedValue(undefined);
		mockSitelineClient(mockTrack);

		const request = new Request('https://example.com/mcp', {
			method: 'POST',
			headers: {
				'user-agent': 'node',
				'authorization': 'Bearer token-123',
				'cf-connecting-ip': '203.0.113.10',
				'accept': 'application/json',
			},
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: '1',
				method: 'tools/call',
				params: {
					name: 'search_docs',
					arguments: {
						query: 'pricing',
						limit: 5,
					},
				},
			}),
		});

		const response = new Response(JSON.stringify({ jsonrpc: '2.0', id: '1', result: {} }), {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'mcp-session-id': 'session-abc',
			},
		});

		await trackMCPRequest(request, response, 123.4, env);

		expect(Siteline).toHaveBeenCalledWith({
			websiteKey: env.SITELINE_WEBSITE_KEY,
			sdk: '@siteline/cloudflare-mcp-worker',
			sdkVersion: '1.0.0',
			integrationType: 'cloudflare-mcp-worker',
		});
		expect(mockTrack).toHaveBeenCalledWith(
			expect.objectContaining({
				isMcp: true,
				method: 'POST',
				status: 200,
				duration: 123,
				mcp: expect.objectContaining({
					method: 'tools/call',
					toolName: 'search_docs',
					sessionId: 'session-abc',
					transport: 'streamable-http',
					argKeys: ['query', 'limit'],
					authPrincipalHash: expect.stringMatching(/^sha256:/),
				}),
			})
		);
	});

	it('maps JSON-RPC error codes by message id', async () => {
		const mockTrack = vi.fn().mockResolvedValue(undefined);
		mockSitelineClient(mockTrack);

		const request = new Request('https://example.com/mcp', {
			method: 'POST',
			body: JSON.stringify([
				{ jsonrpc: '2.0', id: '1', method: 'tools/list' },
				{ jsonrpc: '2.0', id: '2', method: 'tools/call', params: { name: 'lookup' } },
			]),
		});

		const response = new Response(
			JSON.stringify([
				{ jsonrpc: '2.0', id: '1', result: {} },
				{ jsonrpc: '2.0', id: '2', error: { code: -32603, message: 'Internal error' } },
			]),
			{
				status: 200,
				headers: {
					'content-type': 'application/json',
				},
			}
		);

		await trackMCPRequest(request, response, 50, env);

		expect(mockTrack).toHaveBeenCalledTimes(2);
		expect(mockTrack.mock.calls[0][0].mcp.jsonrpcErrorCode).toBeNull();
		expect(mockTrack.mock.calls[1][0].mcp.jsonrpcErrorCode).toBe(-32603);
	});

	it('falls back userAgent from initialize client info when header is missing', async () => {
		const mockTrack = vi.fn().mockResolvedValue(undefined);
		mockSitelineClient(mockTrack);

		const request = new Request('https://example.com/mcp', {
			method: 'POST',
			body: JSON.stringify({
				jsonrpc: '2.0',
				id: '1',
				method: 'initialize',
				params: {
					clientInfo: { name: 'Cursor', version: '0.44.0' },
					protocolVersion: '2025-06-18',
				},
			}),
		});

		const response = new Response(JSON.stringify({ jsonrpc: '2.0', id: '1', result: {} }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});

		await trackMCPRequest(request, response, 10, env);

		expect(mockTrack).toHaveBeenCalledWith(
			expect.objectContaining({
				userAgent: 'mcp-client/Cursor@0.44.0',
			})
		);
	});
});
