import { Siteline } from '@siteline/core';
import { ConfigurationError, TrackingError } from './errors';
import { DEFAULT_MCP_TRANSPORT, MCP_SDK_META } from './mcp-config';
import type { Env } from './types';

type JsonRpcMessage = {
	id?: unknown;
	method?: unknown;
	params?: unknown;
	error?: {
		code?: unknown;
	};
};

type ParsedResponse = {
	transport: string;
	responseBytes: number;
	errorCodeById: Map<string | number, number>;
	errorCodeByIndex: number[];
	firstErrorCode: number | null;
	sessionId: string | null;
};

function normalizeID(id: unknown): string | number | null {
	if (typeof id === 'string' || typeof id === 'number') {
		return id;
	}
	return null;
}

function toJsonRpcMessages(raw: unknown): JsonRpcMessage[] {
	if (Array.isArray(raw)) {
		return raw.filter((entry): entry is JsonRpcMessage => typeof entry === 'object' && entry !== null);
	}
	if (typeof raw === 'object' && raw !== null) {
		return [raw as JsonRpcMessage];
	}
	return [];
}

function extractRequestMessages(requestBody: string): JsonRpcMessage[] {
	if (!requestBody.trim()) {
		return [];
	}
	try {
		const parsed = JSON.parse(requestBody);
		return toJsonRpcMessages(parsed);
	} catch {
		return [];
	}
}

function maybeErrorCode(message: JsonRpcMessage): number | null {
	if (typeof message.error?.code === 'number' && Number.isFinite(message.error.code)) {
		return Math.round(message.error.code);
	}
	return null;
}

function recordErrorCode(
	message: JsonRpcMessage,
	index: number,
	response: ParsedResponse
): void {
	const code = maybeErrorCode(message);
	if (code === null) {
		return;
	}

	if (response.firstErrorCode === null) {
		response.firstErrorCode = code;
	}

	response.errorCodeByIndex[index] = code;
	const id = normalizeID(message.id);
	if (id !== null) {
		response.errorCodeById.set(id, code);
	}
}

function parseSSEFrames(sseText: string): JsonRpcMessage[] {
	const messages: JsonRpcMessage[] = [];
	const lines = sseText.split('\n');

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed.startsWith('data:')) {
			continue;
		}

		const payload = trimmed.slice('data:'.length).trim();
		if (!payload || payload === '[DONE]') {
			continue;
		}

		try {
			const parsed = JSON.parse(payload);
			messages.push(...toJsonRpcMessages(parsed));
		} catch {
			// Ignore non-JSON payload lines.
		}
	}

	return messages;
}

async function parseResponse(response: Response, env: Env): Promise<ParsedResponse> {
	const parsed: ParsedResponse = {
		transport:
			response.headers.get('content-type')?.toLowerCase().includes('text/event-stream') === true
				? 'sse'
				: env.SITELINE_MCP_TRANSPORT?.trim() || DEFAULT_MCP_TRANSPORT,
		responseBytes: 0,
		errorCodeById: new Map(),
		errorCodeByIndex: [],
		firstErrorCode: null,
		sessionId: response.headers.get('mcp-session-id'),
	};

	const buffer = await response.arrayBuffer();
	parsed.responseBytes = buffer.byteLength;

	if (buffer.byteLength === 0) {
		return parsed;
	}

	const bodyText = new TextDecoder().decode(buffer);
	const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
	const messages = contentType.includes('text/event-stream')
		? parseSSEFrames(bodyText)
		: extractRequestMessages(bodyText);

	messages.forEach((message, index) => {
		recordErrorCode(message, index, parsed);
	});

	return parsed;
}

function hashAuthorizationHeader(value: string | null): Promise<string | null> {
	if (!value || !value.trim()) {
		return Promise.resolve(null);
	}

	const normalized = value.replace(/^bearer\s+/i, '').trim();
	if (!normalized) {
		return Promise.resolve(null);
	}

	return crypto.subtle
		.digest('SHA-256', new TextEncoder().encode(normalized))
		.then((buffer) => {
			const bytes = Array.from(new Uint8Array(buffer));
			const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
			return `sha256:${hex}`;
		})
		.catch(() => null);
}

function extractToolName(message: JsonRpcMessage): string | null {
	if (message.method !== 'tools/call' || typeof message.params !== 'object' || message.params === null) {
		return null;
	}

	const params = message.params as Record<string, unknown>;
	return typeof params.name === 'string' ? params.name : null;
}

function extractInitializeClient(message: JsonRpcMessage): {
	clientName: string | null;
	clientVersion: string | null;
	protocolVersion: string | null;
} {
	if (message.method !== 'initialize' || typeof message.params !== 'object' || message.params === null) {
		return { clientName: null, clientVersion: null, protocolVersion: null };
	}

	const params = message.params as Record<string, unknown>;
	const clientInfo =
		typeof params.clientInfo === 'object' && params.clientInfo !== null
			? (params.clientInfo as Record<string, unknown>)
			: null;

	return {
		clientName: typeof clientInfo?.name === 'string' ? clientInfo.name : null,
		clientVersion: typeof clientInfo?.version === 'string' ? clientInfo.version : null,
		protocolVersion: typeof params.protocolVersion === 'string' ? params.protocolVersion : null,
	};
}

function resolveUserAgent(
	request: Request,
	clientName: string | null,
	clientVersion: string | null
): string {
	const headerValue = request.headers.get('user-agent')?.trim();
	if (headerValue) {
		return headerValue;
	}

	const normalizedClientName = clientName?.trim();
	if (normalizedClientName) {
		const normalizedClientVersion = clientVersion?.trim();
		return normalizedClientVersion
			? `mcp-client/${normalizedClientName}@${normalizedClientVersion}`
			: `mcp-client/${normalizedClientName}`;
	}

	return 'mcp-client/unknown';
}

function extractArgKeys(message: JsonRpcMessage, env: Env): string[] | null {
	if (env.SITELINE_MCP_CAPTURE_ARG_KEYS?.toLowerCase() !== 'true') {
		return null;
	}
	if (message.method !== 'tools/call' || typeof message.params !== 'object' || message.params === null) {
		return null;
	}

	const params = message.params as Record<string, unknown>;
	if (typeof params.arguments !== 'object' || params.arguments === null || Array.isArray(params.arguments)) {
		return null;
	}

	const keys = Object.keys(params.arguments as Record<string, unknown>);
	return keys.length > 0 ? keys : null;
}

function errorCodeForMessage(
	message: JsonRpcMessage,
	index: number,
	response: ParsedResponse
): number | null {
	const id = normalizeID(message.id);
	if (id !== null) {
		if (response.errorCodeById.has(id)) {
			return response.errorCodeById.get(id) ?? null;
		}
		return null;
	}

	if (response.errorCodeByIndex[index] !== undefined) {
		return response.errorCodeByIndex[index];
	}

	return response.firstErrorCode;
}

export async function trackMCPRequest(
	request: Request,
	response: Response,
	duration: number,
	env: Env
): Promise<void> {
	if (!env.SITELINE_WEBSITE_KEY) {
		throw new ConfigurationError('Missing SITELINE_WEBSITE_KEY environment variable');
	}

	try {
		const [requestBody, parsedResponse, authPrincipalHash] = await Promise.all([
			request.clone().text(),
			parseResponse(response.clone(), env),
			hashAuthorizationHeader(request.headers.get('authorization')),
		]);
		const requestMessages = extractRequestMessages(requestBody);
		if (requestMessages.length === 0) {
			return;
		}

		const siteline = new Siteline({
			websiteKey: env.SITELINE_WEBSITE_KEY,
			...MCP_SDK_META,
		});

		const basePayload = {
			url: request.url,
			method: request.method,
			status: response.status,
			duration: Math.round(duration),
			userAgent: request.headers.get('user-agent') || '',
			ref: request.headers.get('referer') || '',
			ip: request.headers.get('cf-connecting-ip') || '',
			acceptHeader: request.headers.get('accept') || null,
			isMcp: true as const,
		};

		await Promise.all(
			requestMessages.map(async (message, index) => {
				const { clientName, clientVersion, protocolVersion } = extractInitializeClient(message);
				const argKeys = extractArgKeys(message, env);
				const method = typeof message.method === 'string' ? message.method : null;

				await siteline.track({
					...basePayload,
					userAgent: resolveUserAgent(request, clientName, clientVersion),
					mcp: {
						method,
						toolName: extractToolName(message),
						clientName,
						clientVersion,
						protocolVersion,
						sessionId: parsedResponse.sessionId,
						authPrincipalHash,
						jsonrpcErrorCode: errorCodeForMessage(message, index, parsedResponse),
						transport: parsedResponse.transport,
						responseBytes: parsedResponse.responseBytes,
						argKeys,
					},
				});
			})
		);
	} catch (error) {
		throw new TrackingError('Failed to track MCP request', error);
	}
}
