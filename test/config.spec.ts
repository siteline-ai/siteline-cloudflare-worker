import { describe, expect, it } from 'vitest';
import wranglerConfigText from '../wrangler.jsonc?raw';

type WranglerConfig = {
	workers_dev?: boolean;
	observability?: {
		head_sampling_rate?: number;
		logs?: { head_sampling_rate?: number };
		traces?: { head_sampling_rate?: number };
	};
};

function readWranglerConfig(): WranglerConfig {
	return JSON.parse(wranglerConfigText);
}

describe('wrangler configuration', () => {
	it('keeps workers.dev disabled for reversible route-based deploys', () => {
		const config = readWranglerConfig();

		expect(config.workers_dev).toBe(false);
	});

	it('uses explicit low observability sampling instead of 100 percent sampling', () => {
		const config = readWranglerConfig();

		expect(config.observability?.head_sampling_rate).toBe(0.01);
		expect(config.observability?.logs?.head_sampling_rate).toBe(0.01);
		expect(config.observability?.traces?.head_sampling_rate).toBe(0.01);
		expect(config.observability?.head_sampling_rate).not.toBe(1);
		expect(config.observability?.logs?.head_sampling_rate).not.toBe(1);
		expect(config.observability?.traces?.head_sampling_rate).not.toBe(1);
	});
});
