import { ClaudeAssistantSettings, OpenRouterResponse } from "./types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function sendMessage(
	message: string,
	context: string,
	settings: ClaudeAssistantSettings,
	history: { role: string; content: string }[] = []
): Promise<string> {
	if (!settings.apiKey) {
		throw new Error("API key not configured. Please add your OpenRouter API key in settings.");
	}

	const systemMessage = settings.systemPrompt + (context ? `\n\nRelevant notes from vault:\n${context}` : "");

	const messages = [
		{ role: "system", content: systemMessage },
		...history,
		{ role: "user", content: message },
	];

	const response = await fetch(OPENROUTER_API_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Bearer ${settings.apiKey}`,
			"HTTP-Referer": "https://obsidian.md",
			"X-Title": "Obsidian Claude Assistant",
		},
		body: JSON.stringify({
			model: settings.model,
			messages: messages,
			max_tokens: settings.maxTokens,
			temperature: settings.temperature,
		}),
	});

	const data: OpenRouterResponse = await response.json();

	if (data.error) {
		throw new Error(data.error.message);
	}

	if (!data.choices || data.choices.length === 0) {
		throw new Error("No response from API");
	}

	return data.choices[0].message.content;
}
