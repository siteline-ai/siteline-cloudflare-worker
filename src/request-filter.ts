const STATIC_METADATA_PATHS = new Set([
	'/favicon.ico',
	'/robots.txt',
	'/sitemap.xml',
]);

const STATIC_EXTENSION_PATTERN =
	/\.(?:css|js|mjs|map|gif|jpe?g|png|webp|avif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|mov|mp3|wav|ogg|pdf|zip|gz|br|rar|7z|tar)$/i;

export function shouldTrackRequest(request: Request): boolean {
	if (request.cf?.staticResource === true) {
		return false;
	}

	const pathname = new URL(request.url).pathname.toLowerCase();

	if (STATIC_METADATA_PATHS.has(pathname)) {
		return false;
	}

	return !STATIC_EXTENSION_PATTERN.test(pathname);
}
