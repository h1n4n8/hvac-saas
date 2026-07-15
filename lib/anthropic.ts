import "server-only";
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

/** Server-only Anthropic client. Returns null when ANTHROPIC_API_KEY is unset. */
export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const ANTHROPIC_MODEL = "claude-sonnet-5";
