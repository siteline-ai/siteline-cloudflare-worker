export const SKIP_PATTERN = /\.(css|js|jpe?g|png|gif|svg|webp|ico|woff2?|ttf|mp4|webm|pdf|zip|tar|gz)$/i;

export const SKIP_PATHS = ['/favicon.ico', '/robots.txt', '/sitemap.xml'] as const;

export const SDK_META = {
	sdk: '@siteline/cloudflare-worker',
	sdkVersion: '1.0.1',
	integrationType: 'cloudflare-worker',
} as const;
