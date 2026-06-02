import { describe, expect, it } from 'vitest';
import { shouldTrackRequest } from '../src/request-filter';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('shouldTrackRequest', () => {
	it('skips requests Cloudflare marks as static resources', () => {
		const request = new IncomingRequest('https://example.com/about', {
			cf: { staticResource: true } as unknown as IncomingRequestCfProperties,
		});

		expect(shouldTrackRequest(request)).toBe(false);
	});

	it.each([
		'/styles/site.css',
		'/scripts/app.js',
		'/scripts/app.js.map',
		'/images/photo.jpg',
		'/images/photo.jpeg',
		'/images/photo.png',
		'/images/photo.webp',
		'/images/photo.avif',
		'/images/logo.svg',
		'/fonts/inter.woff2',
		'/media/intro.mp4',
		'/downloads/archive.zip',
	])('skips static asset extension %s', (path) => {
		const request = new Request(`https://example.com${path}`);

		expect(shouldTrackRequest(request)).toBe(false);
	});

	it.each(['/favicon.ico', '/robots.txt', '/sitemap.xml'])(
		'skips static metadata path %s',
		(path) => {
			const request = new Request(`https://example.com${path}`);

			expect(shouldTrackRequest(request)).toBe(false);
		}
	);

	it.each(['/about', '/blog/post', '/api/users'])('tracks content path %s', (path) => {
		const request = new Request(`https://example.com${path}`);

		expect(shouldTrackRequest(request)).toBe(true);
	});

	it('keeps tracking content pages with query strings', () => {
		const request = new Request('https://example.com/search?q=styles.css');

		expect(shouldTrackRequest(request)).toBe(true);
	});

	it('skips static assets even when query strings are present', () => {
		const request = new Request('https://example.com/assets/app.js?v=123');

		expect(shouldTrackRequest(request)).toBe(false);
	});
});
