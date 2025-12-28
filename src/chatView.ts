import { ItemView, WorkspaceLeaf, MarkdownRenderer, Notice } from "obsidian";
import { ChatMessage, ClaudeAssistantSettings } from "./types";
import { sendMessage } from "./api";
import { SmartSearch } from "./search";

export const CHAT_VIEW_TYPE = "timo-assistant-chat";

export class ChatView extends ItemView {
	private messages: ChatMessage[] = [];
	private settings: ClaudeAssistantSettings;
	private search: SmartSearch;
	private messagesContainer: HTMLElement;
	private inputEl: HTMLTextAreaElement;
	private isLoading: boolean = false;

	constructor(
		leaf: WorkspaceLeaf,
		settings: ClaudeAssistantSettings,
		search: SmartSearch
	) {
		super(leaf);
		this.settings = settings;
		this.search = search;
	}

	getViewType(): string {
		return CHAT_VIEW_TYPE;
	}

	getDisplayText(): string {
		return "Timo Assistant";
	}

	getIcon(): string {
		return "message-circle";
	}

	updateSettings(settings: ClaudeAssistantSettings) {
		this.settings = settings;
	}

	async onOpen() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass("claude-assistant-container");

		// Header
		const header = container.createEl("div", { cls: "claude-header" });
		header.createEl("h4", { text: "Timo Assistant" });

		const clearBtn = header.createEl("button", { text: "Clear", cls: "claude-clear-btn" });
		clearBtn.onclick = () => this.clearChat();

		// Messages container
		this.messagesContainer = container.createEl("div", { cls: "claude-messages" });

		// Input area
		const inputContainer = container.createEl("div", { cls: "claude-input-container" });

		this.inputEl = inputContainer.createEl("textarea", {
			cls: "claude-input",
			attr: { placeholder: "Ask Claude anything..." }
		});

		this.inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.sendCurrentMessage();
			}
		});

		const sendBtn = inputContainer.createEl("button", { text: "Send", cls: "claude-send-btn" });
		sendBtn.onclick = () => this.sendCurrentMessage();

		// Welcome message
		if (this.messages.length === 0) {
			this.addWelcomeMessage();
		}
	}

	private addWelcomeMessage() {
		const welcome = this.messagesContainer.createEl("div", { cls: "claude-message claude-welcome" });
		welcome.innerHTML = `
			<p><strong>Timo Assistant</strong></p>
			<p>Ask me anything! I'll search your notes for context.</p>
			<ul>
				<li>Ask questions about your notes</li>
				<li>Get summaries and explanations</li>
				<li>Brainstorm ideas</li>
			</ul>
		`;
	}

	private async sendCurrentMessage() {
		const message = this.inputEl.value.trim();
		if (!message || this.isLoading) return;

		this.inputEl.value = "";
		await this.sendMessageToChat(message);
	}

	async sendMessageToChat(message: string, selectedText?: string) {
		if (this.isLoading) return;

		// Clear welcome message if present
		const welcome = this.messagesContainer.querySelector(".claude-welcome");
		if (welcome) welcome.remove();

		// Add user message
		this.addMessageToUI("user", selectedText ? `${message}\n\n> ${selectedText}` : message);
		this.messages.push({
			role: "user",
			content: selectedText ? `${message}\n\nSelected text:\n${selectedText}` : message,
			timestamp: new Date()
		});

		this.isLoading = true;
		const loadingEl = this.addLoadingIndicator();

		try {
			// Search for context
			const searchResults = await this.search.search(message);
			const context = this.search.formatContext(searchResults);

			// Prepare history (last 10 messages)
			const history = this.messages.slice(-10).map(m => ({
				role: m.role,
				content: m.content
			}));

			// Send to API
			const response = await sendMessage(message, context, this.settings, history.slice(0, -1));

			// Remove loading and add response
			loadingEl.remove();
			this.addMessageToUI("assistant", response);
			this.messages.push({
				role: "assistant",
				content: response,
				timestamp: new Date()
			});

			// Show context info
			if (searchResults.length > 0) {
				const contextInfo = this.messagesContainer.createEl("div", { cls: "claude-context-info" });
				contextInfo.setText(`Context from: ${searchResults.map(r => r.file).join(", ")}`);
			}

		} catch (error) {
			loadingEl.remove();
			new Notice(`Error: ${error.message}`);
			this.addMessageToUI("assistant", `Error: ${error.message}`);
		}

		this.isLoading = false;
		this.scrollToBottom();
	}

	private addMessageToUI(role: "user" | "assistant", content: string) {
		const messageEl = this.messagesContainer.createEl("div", {
			cls: `claude-message claude-${role}`
		});

		const contentEl = messageEl.createEl("div", { cls: "claude-message-content" });

		// Render markdown for assistant messages
		if (role === "assistant") {
			MarkdownRenderer.render(
				this.app,
				content,
				contentEl,
				"",
				this
			);
		} else {
			contentEl.setText(content);
		}

		this.scrollToBottom();
	}

	private addLoadingIndicator(): HTMLElement {
		const loading = this.messagesContainer.createEl("div", { cls: "claude-message claude-loading" });
		loading.innerHTML = `<div class="claude-loading-dots"><span></span><span></span><span></span></div>`;
		this.scrollToBottom();
		return loading;
	}

	private scrollToBottom() {
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}

	private clearChat() {
		this.messages = [];
		this.messagesContainer.empty();
		this.addWelcomeMessage();
	}

	async onClose() {
		// Cleanup
	}
}
