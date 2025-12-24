export class SitelineError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SitelineError';
		Object.setPrototypeOf(this, SitelineError.prototype);
	}
}

export class ConfigurationError extends SitelineError {
	constructor(message: string) {
		super(message);
		this.name = 'ConfigurationError';
		Object.setPrototypeOf(this, ConfigurationError.prototype);
	}
}

export class TrackingError extends SitelineError {
	constructor(message: string, public readonly cause?: unknown) {
		super(message);
		this.name = 'TrackingError';
		Object.setPrototypeOf(this, TrackingError.prototype);
	}
}