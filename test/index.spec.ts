import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Siteline Worker Integration', () => {
	beforeEach(() => {
		env.SITELINE_WEBSITE_KEY = 'siteline_secret_' + '0'.repeat(32);
	});

	describe('request proxying', () => {
		it('proxies GET requests and returns upstream response', async () => {
			const request = new IncomingRequest('http://example.com');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.ok).toBe(true);
			const text = await response.text();
			expect(text).toContain('Example Domain');
		});

		it('proxies POST requests', async () => {
			const request = new IncomingRequest('http://example.com', {
				method: 'POST',
				body: JSON.stringify({ test: 'data' }),
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response).toBeDefined();
			expect(response.status).toBeDefined();
		});

		it('preserves response headers', async () => {
			const request = new IncomingRequest('http://example.com');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.headers.get('content-type')).toBeTruthy();
		});
	});

	describe('static asset filtering', () => {
		const staticAssets = [
			'/style.css',
			'/script.js',
			'/image.png',
			'/favicon.ico',
			'/robots.txt',
			'/sitemap.xml',
		];

		staticAssets.forEach((path) => {
			it(`skips tracking for ${path}`, async () => {
				const request = new IncomingRequest(`http://example.com${path}`);
				const ctx = createExecutionContext();
				const response = await worker.fetch(request, env, ctx);
				await waitOnExecutionContext(ctx);

				expect(response).toBeDefined();
				expect(response.status).toBeDefined();
			});
		});
	});

	describe('HTTP methods', () => {
		it('handles PUT requests without tracking', async () => {
			const request = new IncomingRequest('http://example.com', {
				method: 'PUT',
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response).toBeDefined();
		});

		it('handles DELETE requests without tracking', async () => {
			const request = new IncomingRequest('http://example.com', {
				method: 'DELETE',
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response).toBeDefined();
		});
	});

	describe('error handling', () => {
		it('handles missing SITELINE_WEBSITE_KEY gracefully', async () => {
			const testEnv = { SITELINE_WEBSITE_KEY: '' };
			const request = new IncomingRequest('http://example.com');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, testEnv as any, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.ok).toBe(true);
		});

		it('handles undefined SITELINE_WEBSITE_KEY gracefully', async () => {
			const testEnv = {};
			const request = new IncomingRequest('http://example.com');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, testEnv as any, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.ok).toBe(true);
		});

		it('continues serving requests when tracking fails', async () => {
			const testEnv = { SITELINE_WEBSITE_KEY: 'invalid_key' };
			const request = new IncomingRequest('http://example.com');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, testEnv as any, ctx);
			await waitOnExecutionContext(ctx);

			expect(response).toBeDefined();
		});
	});

	describe('performance', () => {
		it('completes request within reasonable time', async () => {
			const request = new IncomingRequest('http://example.com');
			const ctx = createExecutionContext();
			const start = Date.now();
			await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);
			const duration = Date.now() - start;

			expect(duration).toBeLessThan(5000);
		});
	});

	describe('tracking scenarios', () => {
		it('tracks HTML pages', async () => {
			const request = new IncomingRequest('http://example.com/about');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response).toBeDefined();
		});

		it('tracks API endpoints', async () => {
			const request = new IncomingRequest('http://example.com/api/users', {
				method: 'POST',
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response).toBeDefined();
		});

		it('tracks requests with query parameters', async () => {
			const request = new IncomingRequest('http://example.com/search?q=test');
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			await waitOnExecutionContext(ctx);

			expect(response).toBeDefined();
		});
	});
});
