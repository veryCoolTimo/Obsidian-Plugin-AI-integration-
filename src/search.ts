import { App, TFile } from "obsidian";
import { SearchResult, ClaudeAssistantSettings } from "./types";

export class SmartSearch {
	private app: App;
	private settings: ClaudeAssistantSettings;

	constructor(app: App, settings: ClaudeAssistantSettings) {
		this.app = app;
		this.settings = settings;
	}

	updateSettings(settings: ClaudeAssistantSettings) {
		this.settings = settings;
	}

	async search(query: string): Promise<SearchResult[]> {
		const files = this.app.vault.getMarkdownFiles();
		const results: SearchResult[] = [];
		const queryTerms = this.extractTerms(query);

		for (const file of files) {
			const content = await this.app.vault.cachedRead(file);
			const score = this.calculateScore(content, file.basename, queryTerms);

			if (score > this.settings.searchThreshold) {
				results.push({
					file: file.path,
					content: this.extractRelevantContent(content, queryTerms),
					score: score,
				});
			}
		}

		// Sort by score and limit results
		results.sort((a, b) => b.score - a.score);
		return results.slice(0, this.settings.maxContextNotes);
	}

	private extractTerms(query: string): string[] {
		// Remove common stop words and extract meaningful terms
		const stopWords = new Set([
			"a", "an", "the", "is", "are", "was", "were", "be", "been",
			"being", "have", "has", "had", "do", "does", "did", "will",
			"would", "could", "should", "may", "might", "must", "shall",
			"can", "to", "of", "in", "for", "on", "with", "at", "by",
			"from", "as", "into", "through", "during", "before", "after",
			"above", "below", "between", "under", "again", "further",
			"then", "once", "here", "there", "when", "where", "why", "how",
			"all", "each", "few", "more", "most", "other", "some", "such",
			"no", "nor", "not", "only", "own", "same", "so", "than", "too",
			"very", "just", "and", "but", "if", "or", "because", "until",
			"while", "this", "that", "these", "those", "what", "which",
			"who", "whom", "я", "ты", "он", "она", "мы", "вы", "они",
			"это", "что", "как", "где", "когда", "почему", "и", "или",
			"но", "а", "в", "на", "с", "к", "у", "о", "по", "за", "из",
		]);

		return query
			.toLowerCase()
			.split(/\s+/)
			.filter(term => term.length > 2 && !stopWords.has(term));
	}

	private calculateScore(content: string, filename: string, terms: string[]): number {
		const lowerContent = content.toLowerCase();
		const lowerFilename = filename.toLowerCase();
		let score = 0;

		for (const term of terms) {
			// Check filename (high weight)
			if (lowerFilename.includes(term)) {
				score += 0.5;
			}

			// Check content
			const regex = new RegExp(term, "gi");
			const matches = lowerContent.match(regex);
			if (matches) {
				// Logarithmic scoring to avoid over-weighting repetitive terms
				score += Math.log(1 + matches.length) * 0.1;
			}

			// Check for exact phrase in content
			if (lowerContent.includes(term)) {
				score += 0.2;
			}
		}

		// Normalize by number of terms
		return terms.length > 0 ? score / terms.length : 0;
	}

	private extractRelevantContent(content: string, terms: string[]): string {
		const lines = content.split("\n");
		const relevantLines: string[] = [];
		const maxLines = 20;
		const contextLines = 2;

		for (let i = 0; i < lines.length && relevantLines.length < maxLines; i++) {
			const line = lines[i].toLowerCase();
			const hasMatch = terms.some(term => line.includes(term));

			if (hasMatch) {
				// Add context lines before and after
				const start = Math.max(0, i - contextLines);
				const end = Math.min(lines.length - 1, i + contextLines);

				for (let j = start; j <= end; j++) {
					const contextLine = lines[j].trim();
					if (contextLine && !relevantLines.includes(contextLine)) {
						relevantLines.push(contextLine);
					}
				}
			}
		}

		if (relevantLines.length === 0) {
			// Return first portion if no matches
			return lines.slice(0, 10).join("\n").substring(0, 500);
		}

		return relevantLines.join("\n").substring(0, 1000);
	}

	formatContext(results: SearchResult[]): string {
		if (results.length === 0) return "";

		return results
			.map(r => `## ${r.file}\n${r.content}`)
			.join("\n\n---\n\n");
	}
}
