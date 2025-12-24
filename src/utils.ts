import { SKIP_PATTERN, SKIP_PATHS } from './config';

export function shouldTrack(req: Request): boolean {
	if (req.method !== 'GET' && req.method !== 'POST') return false;

	const { pathname } = new URL(req.url);
	return !SKIP_PATHS.includes(pathname as any) && !SKIP_PATTERN.test(pathname);
}