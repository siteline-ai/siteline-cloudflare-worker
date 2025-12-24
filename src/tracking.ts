import { Siteline } from '@siteline/core';
import { SDK_META } from './config';
import { ConfigurationError, TrackingError } from './errors';
import { Env } from './types';

export async function track(
	req: Request,
	status: number,
	duration: number,
	env: Env
): Promise<void> {
	if (!env.SITELINE_WEBSITE_KEY) {
		throw new ConfigurationError('Missing SITELINE_WEBSITE_KEY environment variable');
	}

	try {
		const siteline = new Siteline({
			websiteKey: env.SITELINE_WEBSITE_KEY,
			...SDK_META,
		});

		await siteline.track({
			url: req.url,
			method: req.method,
			status,
			duration: Math.round(duration),
			userAgent: req.headers.get('user-agent') || '',
			ref: req.headers.get('referer') || '',
			ip: req.headers.get('cf-connecting-ip') || '',
		});
	} catch (error) {
		throw new TrackingError('Failed to track request', error);
	}
}
