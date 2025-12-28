export interface ClaudeAssistantSettings {
	apiKey: string;
	model: string;
	maxTokens: number;
	temperature: number;
	systemPrompt: string;
	maxContextNotes: number;
	searchThreshold: number;
}

export const DEFAULT_SETTINGS: ClaudeAssistantSettings = {
	apiKey: "",
	model: "anthropic/claude-sonnet-4",
	maxTokens: 4096,
	temperature: 0.7,
	systemPrompt: `You are a helpful AI assistant integrated into Obsidian.
You have access to the user's notes for context.
Answer questions based on the provided context when relevant.
Be concise and helpful. Use markdown formatting.`,
	maxContextNotes: 5,
	searchThreshold: 0.3,
};

export interface ChatMessage {
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
}

export interface SearchResult {
	file: string;
	content: string;
	score: number;
}

export interface OpenRouterResponse {
	choices: {
		message: {
			content: string;
		};
	}[];
	error?: {
		message: string;
	};
}
