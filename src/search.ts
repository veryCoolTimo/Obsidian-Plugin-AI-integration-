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

		// Extract query info
		const queryTerms = this.extractTerms(query);
		const dateInfo = this.extractDateFromQuery(query);

		for (const file of files) {
			const content = await this.app.vault.cachedRead(file);
			let score = this.calculateScore(content, file.path, file.basename, queryTerms);

			// Boost score for date matches
			if (dateInfo) {
				const dateScore = this.calculateDateScore(file.path, content, dateInfo);
				score += dateScore;
			}

			if (score > this.settings.searchThreshold) {
				results.push({
					file: file.path,
					content: this.extractRelevantContent(content, queryTerms, file.path),
					score: score,
				});
			}
		}

		// Sort by score and limit results
		results.sort((a, b) => b.score - a.score);
		return results.slice(0, this.settings.maxContextNotes);
	}

	private extractDateFromQuery(query: string): { day?: number; month?: number; year?: number } | null {
		const lowerQuery = query.toLowerCase();

		// Patterns for dates in Russian
		const dayPatterns = [
			/(\d{1,2})\s*числа/,           // 26 числа
			/(\d{1,2})\s*-?го/,             // 26-го, 26го
			/за\s*(\d{1,2})/,               // за 26
			/от\s*(\d{1,2})/,               // от 26
		];

		// Month names in Russian
		const monthNames: { [key: string]: number } = {
			'январ': 1, 'феврал': 2, 'март': 3, 'апрел': 4,
			'мая': 5, 'май': 5, 'июн': 6, 'июл': 7, 'август': 8,
			'сентябр': 9, 'октябр': 10, 'ноябр': 11, 'декабр': 12,
		};

		let day: number | undefined;
		let month: number | undefined;
		let year: number | undefined;

		// Extract day
		for (const pattern of dayPatterns) {
			const match = lowerQuery.match(pattern);
			if (match) {
				day = parseInt(match[1]);
				break;
			}
		}

		// Also check for standalone numbers that could be days
		if (!day) {
			const numberMatch = query.match(/\b(\d{1,2})\b/);
			if (numberMatch) {
				const num = parseInt(numberMatch[1]);
				if (num >= 1 && num <= 31) {
					day = num;
				}
			}
		}

		// Extract month
		for (const [name, num] of Object.entries(monthNames)) {
			if (lowerQuery.includes(name)) {
				month = num;
				break;
			}
		}

		// Extract year
		const yearMatch = query.match(/20(\d{2})/);
		if (yearMatch) {
			year = 2000 + parseInt(yearMatch[1]);
		}

		// Check for relative dates
		if (lowerQuery.includes('вчера') || lowerQuery.includes('yesterday')) {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			return {
				day: yesterday.getDate(),
				month: yesterday.getMonth() + 1,
				year: yesterday.getFullYear()
			};
		}

		if (lowerQuery.includes('сегодня') || lowerQuery.includes('today')) {
			const today = new Date();
			return {
				day: today.getDate(),
				month: today.getMonth() + 1,
				year: today.getFullYear()
			};
		}

		if (lowerQuery.includes('позавчера')) {
			const dayBefore = new Date();
			dayBefore.setDate(dayBefore.getDate() - 2);
			return {
				day: dayBefore.getDate(),
				month: dayBefore.getMonth() + 1,
				year: dayBefore.getFullYear()
			};
		}

		if (day || month || year) {
			return { day, month, year };
		}

		return null;
	}

	private calculateDateScore(filePath: string, content: string, dateInfo: { day?: number; month?: number; year?: number }): number {
		let score = 0;
		const lowerPath = filePath.toLowerCase();

		// Check if file path contains date patterns
		// e.g., daily/2025/12/26.md or 2025-12-26

		if (dateInfo.day) {
			const dayStr = dateInfo.day.toString().padStart(2, '0');
			const dayStrShort = dateInfo.day.toString();

			// Strong match: day in filename
			if (lowerPath.includes(`/${dayStr}.md`) || lowerPath.includes(`/${dayStrShort}.md`)) {
				score += 1.5;
			}

			// Match in path (like /26/ or -26-)
			if (lowerPath.includes(`/${dayStr}/`) || lowerPath.includes(`-${dayStr}-`) || lowerPath.includes(`-${dayStr}.`)) {
				score += 1.0;
			}

			// Match day in content
			if (content.includes(dayStrShort)) {
				score += 0.3;
			}
		}

		if (dateInfo.month) {
			const monthStr = dateInfo.month.toString().padStart(2, '0');
			if (lowerPath.includes(`/${monthStr}/`) || lowerPath.includes(`-${monthStr}-`)) {
				score += 0.8;
			}
		}

		if (dateInfo.year) {
			if (lowerPath.includes(`/${dateInfo.year}/`) || lowerPath.includes(`${dateInfo.year}-`)) {
				score += 0.5;
			}
		}

		// Check for "daily" folder (high relevance for date queries)
		if (lowerPath.includes('daily/') || lowerPath.includes('journal/') || lowerPath.includes('дневник/')) {
			score += 0.5;
		}

		return score;
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
			"мне", "меня", "тебя", "его", "её", "нас", "вас", "их",
			"числа", "число", "день", "писал", "писала", "делал", "делала",
			"интересного", "интересное", "было", "была", "были",
		]);

		return query
			.toLowerCase()
			.split(/\s+/)
			.filter(term => term.length > 2 && !stopWords.has(term));
	}

	private calculateScore(content: string, filePath: string, filename: string, terms: string[]): number {
		const lowerContent = content.toLowerCase();
		const lowerFilename = filename.toLowerCase();
		const lowerPath = filePath.toLowerCase();
		let score = 0;

		for (const term of terms) {
			// Check filename (high weight)
			if (lowerFilename.includes(term)) {
				score += 0.5;
			}

			// Check full path
			if (lowerPath.includes(term)) {
				score += 0.3;
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

		// Normalize by number of terms (but don't divide by zero)
		return terms.length > 0 ? score / terms.length : 0.1;
	}

	private extractRelevantContent(content: string, terms: string[], filePath: string): string {
		const lines = content.split("\n");
		const relevantLines: string[] = [];
		const maxLines = 30;
		const contextLines = 2;

		// Always include the first few lines (usually headers/metadata)
		const headerLines = lines.slice(0, 5).filter(l => l.trim());
		relevantLines.push(...headerLines);

		for (let i = 5; i < lines.length && relevantLines.length < maxLines; i++) {
			const line = lines[i].toLowerCase();
			const hasMatch = terms.length === 0 || terms.some(term => line.includes(term));

			if (hasMatch && lines[i].trim()) {
				// Add context lines before and after
				const start = Math.max(5, i - contextLines);
				const end = Math.min(lines.length - 1, i + contextLines);

				for (let j = start; j <= end; j++) {
					const contextLine = lines[j].trim();
					if (contextLine && !relevantLines.includes(contextLine)) {
						relevantLines.push(contextLine);
					}
				}
			}
		}

		// If still no good matches, return more of the file
		if (relevantLines.length <= 5) {
			return lines.slice(0, 30).join("\n").substring(0, 1500);
		}

		return relevantLines.join("\n").substring(0, 1500);
	}

	formatContext(results: SearchResult[]): string {
		if (results.length === 0) return "";

		return results
			.map(r => `## ${r.file}\n${r.content}`)
			.join("\n\n---\n\n");
	}
}
