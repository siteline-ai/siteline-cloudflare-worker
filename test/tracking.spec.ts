import { describe, it, expect, vi, beforeEach } from 'vitest';
import { track } from '../src/tracking';
import { ConfigurationError, TrackingError } from '../src/errors';
import { Siteline } from '@siteline/core';
import type { Env } from '../src/types';

vi.mock('@siteline/core', () => ({
	Siteline: vi.fn(),
}));

describe('track', () => {
	const mockEnv: Env = {
		SITELINE_WEBSITE_KEY: 'siteline_secret_' + '0'.repeat(32),
	};

	const mockRequest = new Request('https://example.com/test', {
		method: 'GET',
		headers: {
			'user-agent': 'Mozilla/5.0',
			referer: 'https://google.com',
			'cf-connecting-ip': '192.168.1.1',
		},
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('configuration validation', () => {
		it('throws ConfigurationError when SITELINE_WEBSITE_KEY is missing', async () => {
			const envWithoutKey: Env = { SITELINE_WEBSITE_KEY: '' };
			await expect(track(mockRequest, 200, 100, envWithoutKey)).rejects.toThrow(
				ConfigurationError
			);
			await expect(track(mockRequest, 200, 100, envWithoutKey)).rejects.toThrow(
				'Missing SITELINE_WEBSITE_KEY environment variable'
			);
		});

		it('throws ConfigurationError when SITELINE_WEBSITE_KEY is undefined', async () => {
			const envWithoutKey = {} as Env;
			await expect(track(mockRequest, 200, 100, envWithoutKey)).rejects.toThrow(
				ConfigurationError
			);
		});
	});

	describe('successful tracking', () => {
		it('initializes Siteline with correct configuration', async () => {
			const mockTrack = vi.fn().mockResolvedValue(undefined);
			vi.mocked(Siteline).mockImplementation(
				() => ({ track: mockTrack } as any)
			);

			await track(mockRequest, 200, 123.45, mockEnv);

			expect(Siteline).toHaveBeenCalledWith({
				websiteKey: mockEnv.SITELINE_WEBSITE_KEY,
				sdk: '@siteline/cloudflare-worker',
				sdkVersion: '1.0.1',
				integrationType: 'cloudflare-worker',
			});
		});

		it('calls track with correct parameters', async () => {
			const mockTrack = vi.fn().mockResolvedValue(undefined);
			vi.mocked(Siteline).mockImplementation(
				() => ({ track: mockTrack } as any)
			);

			await track(mockRequest, 200, 123.45, mockEnv);

			expect(mockTrack).toHaveBeenCalledWith({
				url: 'https://example.com/test',
				method: 'GET',
				status: 200,
				duration: 123,
				userAgent: 'Mozilla/5.0',
				ref: 'https://google.com',
				ip: '192.168.1.1',
			});
		});

		it('rounds duration to nearest integer', async () => {
			const mockTrack = vi.fn().mockResolvedValue(undefined);
			vi.mocked(Siteline).mockImplementation(
				() => ({ track: mockTrack } as any)
			);

			await track(mockRequest, 200, 99.9, mockEnv);
			expect(mockTrack).toHaveBeenCalledWith(
				expect.objectContaining({ duration: 100 })
			);
		});

		it('handles missing headers gracefully', async () => {
			const mockTrack = vi.fn().mockResolvedValue(undefined);
			vi.mocked(Siteline).mockImplementation(
				() => ({ track: mockTrack } as any)
			);

			const requestWithoutHeaders = new Request('https://example.com/test', {
				method: 'POST',
			});

			await track(requestWithoutHeaders, 404, 50, mockEnv);

			expect(mockTrack).toHaveBeenCalledWith({
				url: 'https://example.com/test',
				method: 'POST',
				status: 404,
				duration: 50,
				userAgent: '',
				ref: '',
				ip: '',
			});
		});
	});

	describe('error handling', () => {
		it('throws TrackingError when Siteline constructor fails', async () => {
			vi.mocked(Siteline).mockImplementation(() => {
				throw new Error('SDK initialization failed');
			});

			await expect(track(mockRequest, 200, 100, mockEnv)).rejects.toThrow(
				TrackingError
			);
			await expect(track(mockRequest, 200, 100, mockEnv)).rejects.toThrow(
				'Failed to track request'
			);
		});

		it('throws TrackingError when track method fails', async () => {
			const mockTrack = vi.fn().mockRejectedValue(new Error('Network error'));
			vi.mocked(Siteline).mockImplementation(
				() => ({ track: mockTrack } as any)
			);

			await expect(track(mockRequest, 200, 100, mockEnv)).rejects.toThrow(
				TrackingError
			);
		});

		it('preserves original error as cause', async () => {
			const originalError = new Error('Network timeout');
			const mockTrack = vi.fn().mockRejectedValue(originalError);
			vi.mocked(Siteline).mockImplementation(
				() => ({ track: mockTrack } as any)
			);

			try {
				await track(mockRequest, 200, 100, mockEnv);
			} catch (error) {
				expect(error).toBeInstanceOf(TrackingError);
				expect((error as TrackingError).cause).toBe(originalError);
			}
		});
	});

	describe('different HTTP methods', () => {
		it('tracks POST requests', async () => {
			const mockTrack = vi.fn().mockResolvedValue(undefined);
			vi.mocked(Siteline).mockImplementation(
				() => ({ track: mockTrack } as any)
			);

			const postRequest = new Request('https://example.com/api', {
				method: 'POST',
			});

			await track(postRequest, 201, 100, mockEnv);

			expect(mockTrack).toHaveBeenCalledWith(
				expect.objectContaining({ method: 'POST', status: 201 })
			);
		});
	});

	describe('different response statuses', () => {
		const mockTrack = vi.fn().mockResolvedValue(undefined);

		beforeEach(() => {
			vi.mocked(Siteline).mockImplementation(
				() => ({ track: mockTrack } as any)
			);
		});

		it('tracks 2xx responses', async () => {
			await track(mockRequest, 200, 100, mockEnv);
			expect(mockTrack).toHaveBeenCalledWith(
				expect.objectContaining({ status: 200 })
			);
		});

		it('tracks 3xx responses', async () => {
			await track(mockRequest, 301, 100, mockEnv);
			expect(mockTrack).toHaveBeenCalledWith(
				expect.objectContaining({ status: 301 })
			);
		});

		it('tracks 4xx responses', async () => {
			await track(mockRequest, 404, 100, mockEnv);
			expect(mockTrack).toHaveBeenCalledWith(
				expect.objectContaining({ status: 404 })
			);
		});

		it('tracks 5xx responses', async () => {
			await track(mockRequest, 500, 100, mockEnv);
			expect(mockTrack).toHaveBeenCalledWith(
				expect.objectContaining({ status: 500 })
			);
		});
	});
});