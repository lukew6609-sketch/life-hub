// Runs through Vercel AI Gateway: on Vercel it authenticates automatically (OIDC), no API key needed.
export const AI_MODEL = process.env.AI_MODEL || "anthropic/claude-sonnet-5.5";
