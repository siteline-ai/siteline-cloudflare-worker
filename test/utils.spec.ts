import { describe, it, expect } from 'vitest';
import { shouldTrack } from '../src/utils';

describe('shouldTrack', () => {
	describe('HTTP methods', () => {
		it('tracks GET requests', () => {
			const req = new Request('https://example.com/', { method: 'GET' });
			expect(shouldTrack(req)).toBe(true);
		});

		it('tracks POST requests', () => {
			const req = new Request('https://example.com/', { method: 'POST' });
			expect(shouldTrack(req)).toBe(true);
		});

		it('skips PUT requests', () => {
			const req = new Request('https://example.com/', { method: 'PUT' });
			expect(shouldTrack(req)).toBe(false);
		});

		it('skips DELETE requests', () => {
			const req = new Request('https://example.com/', { method: 'DELETE' });
			expect(shouldTrack(req)).toBe(false);
		});

		it('skips PATCH requests', () => {
			const req = new Request('https://example.com/', { method: 'PATCH' });
			expect(shouldTrack(req)).toBe(false);
		});

		it('skips HEAD requests', () => {
			const req = new Request('https://example.com/', { method: 'HEAD' });
			expect(shouldTrack(req)).toBe(false);
		});

		it('skips OPTIONS requests', () => {
			const req = new Request('https://example.com/', { method: 'OPTIONS' });
			expect(shouldTrack(req)).toBe(false);
		});
	});

	describe('static file patterns', () => {
		const staticFiles = [
			'style.css',
			'script.js',
			'image.jpg',
			'image.jpeg',
			'photo.png',
			'graphic.gif',
			'icon.svg',
			'avatar.webp',
			'favicon.ico',
			'font.woff',
			'font.woff2',
			'font.ttf',
			'video.mp4',
			'video.webm',
			'document.pdf',
			'archive.zip',
			'archive.tar',
			'archive.gz',
		];

		staticFiles.forEach((file) => {
			it(`skips ${file}`, () => {
				const req = new Request(`https://example.com/${file}`, { method: 'GET' });
				expect(shouldTrack(req)).toBe(false);
			});
		});

		it('skips static files in subdirectories', () => {
			const req = new Request('https://example.com/assets/style.css', { method: 'GET' });
			expect(shouldTrack(req)).toBe(false);
		});

		it('is case insensitive for file extensions', () => {
			const req = new Request('https://example.com/IMAGE.JPG', { method: 'GET' });
			expect(shouldTrack(req)).toBe(false);
		});
	});

	describe('special paths', () => {
		it('skips /favicon.ico', () => {
			const req = new Request('https://example.com/favicon.ico', { method: 'GET' });
			expect(shouldTrack(req)).toBe(false);
		});

		it('skips /robots.txt', () => {
			const req = new Request('https://example.com/robots.txt', { method: 'GET' });
			expect(shouldTrack(req)).toBe(false);
		});

		it('skips /sitemap.xml', () => {
			const req = new Request('https://example.com/sitemap.xml', { method: 'GET' });
			expect(shouldTrack(req)).toBe(false);
		});

		it('does not skip similar but different paths', () => {
			const req = new Request('https://example.com/my-sitemap.xml', { method: 'GET' });
			expect(shouldTrack(req)).toBe(true);
		});
	});

	describe('trackable paths', () => {
		it('tracks root path', () => {
			const req = new Request('https://example.com/', { method: 'GET' });
			expect(shouldTrack(req)).toBe(true);
		});

		it('tracks API endpoints', () => {
			const req = new Request('https://example.com/api/users', { method: 'GET' });
			expect(shouldTrack(req)).toBe(true);
		});

		it('tracks HTML pages', () => {
			const req = new Request('https://example.com/about.html', { method: 'GET' });
			expect(shouldTrack(req)).toBe(true);
		});

		it('tracks paths without extensions', () => {
			const req = new Request('https://example.com/dashboard', { method: 'GET' });
			expect(shouldTrack(req)).toBe(true);
		});

		it('tracks dynamic routes', () => {
			const req = new Request('https://example.com/users/123', { method: 'GET' });
			expect(shouldTrack(req)).toBe(true);
		});

		it('tracks with query parameters', () => {
			const req = new Request('https://example.com/search?q=test', { method: 'GET' });
			expect(shouldTrack(req)).toBe(true);
		});
	});
});