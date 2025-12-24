import { describe, it, expect } from 'vitest';
import { SitelineError, ConfigurationError, TrackingError } from '../src/errors';

describe('Custom Errors', () => {
	describe('SitelineError', () => {
		it('creates error with correct message and name', () => {
			const error = new SitelineError('Test error');
			expect(error.message).toBe('Test error');
			expect(error.name).toBe('SitelineError');
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(SitelineError);
		});

		it('maintains prototype chain', () => {
			const error = new SitelineError('Test');
			expect(Object.getPrototypeOf(error)).toBe(SitelineError.prototype);
		});
	});

	describe('ConfigurationError', () => {
		it('creates configuration error with correct properties', () => {
			const error = new ConfigurationError('Missing config');
			expect(error.message).toBe('Missing config');
			expect(error.name).toBe('ConfigurationError');
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(SitelineError);
			expect(error).toBeInstanceOf(ConfigurationError);
		});

		it('maintains prototype chain', () => {
			const error = new ConfigurationError('Test');
			expect(Object.getPrototypeOf(error)).toBe(ConfigurationError.prototype);
		});
	});

	describe('TrackingError', () => {
		it('creates tracking error with message only', () => {
			const error = new TrackingError('Tracking failed');
			expect(error.message).toBe('Tracking failed');
			expect(error.name).toBe('TrackingError');
			expect(error.cause).toBeUndefined();
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(SitelineError);
			expect(error).toBeInstanceOf(TrackingError);
		});

		it('creates tracking error with cause', () => {
			const originalError = new Error('Original error');
			const error = new TrackingError('Tracking failed', originalError);
			expect(error.message).toBe('Tracking failed');
			expect(error.name).toBe('TrackingError');
			expect(error.cause).toBe(originalError);
		});

		it('maintains prototype chain', () => {
			const error = new TrackingError('Test');
			expect(Object.getPrototypeOf(error)).toBe(TrackingError.prototype);
		});

		it('handles non-Error cause objects', () => {
			const error = new TrackingError('Failed', { code: 500 });
			expect(error.cause).toEqual({ code: 500 });
		});
	});
});