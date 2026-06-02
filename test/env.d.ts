import type { Env as WorkerEnv } from '../src/types';

declare global {
	namespace Cloudflare {
		interface Env {
			SITELINE_WEBSITE_KEY: string;
		}
	}
}

declare module 'cloudflare:test' {
	interface ProvidedEnv extends WorkerEnv {}
}
