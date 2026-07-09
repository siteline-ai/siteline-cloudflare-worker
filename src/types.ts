export interface Env extends Cloudflare.Env {
	SITELINE_WEBSITE_KEY: string;
	SITELINE_API_URL?: string;
	SITELINE_MCP_CAPTURE_ARG_KEYS?: string;
	SITELINE_MCP_TRANSPORT?: string;
}
