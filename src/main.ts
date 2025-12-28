import { App, Editor, MarkdownView, Modal, Notice, Plugin } from "obsidian";
import { ClaudeAssistantSettings, DEFAULT_SETTINGS } from "./types";
import { ClaudeAssistantSettingTab } from "./settings";
import { ChatView, CHAT_VIEW_TYPE } from "./chatView";
import { SmartSearch } from "./search";
import { sendMessage } from "./api";

export default class ClaudeAssistantPlugin extends Plugin {
	settings: ClaudeAssistantSettings;
	private search: SmartSearch;

	async onload() {
		await this.loadSettings();

		this.search = new SmartSearch(this.app, this.settings);

		// Register chat view
		this.registerView(
			CHAT_VIEW_TYPE,
			(leaf) => new ChatView(leaf, this.settings, this.search)
		);

		// Ribbon icon to open chat
		this.addRibbonIcon("message-circle", "Claude Assistant", () => {
			this.activateChatView();
		});

		// Command: Open chat sidebar
		this.addCommand({
			id: "open-chat",
			name: "Open Chat",
			callback: () => {
				this.activateChatView();
			}
		});

		// Command: Ask Claude (quick prompt)
		this.addCommand({
			id: "ask-claude",
			name: "Ask Claude",
			callback: () => {
				new QuickAskModal(this.app, this).open();
			}
		});

		// Command: Ask about selection
		this.addCommand({
			id: "ask-about-selection",
			name: "Ask Claude about selection",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection) {
					new QuickAskModal(this.app, this, selection).open();
				} else {
					new Notice("Please select some text first");
				}
			}
		});

		// Command: Explain selection
		this.addCommand({
			id: "explain-selection",
			name: "Explain selection",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection) {
					await this.askAboutText("Explain this:", selection);
				} else {
					new Notice("Please select some text first");
				}
			}
		});

		// Command: Summarize selection
		this.addCommand({
			id: "summarize-selection",
			name: "Summarize selection",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection) {
					await this.askAboutText("Summarize this concisely:", selection);
				} else {
					new Notice("Please select some text first");
				}
			}
		});

		// Command: Improve writing
		this.addCommand({
			id: "improve-writing",
			name: "Improve writing",
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection) {
					await this.improveText(editor, selection);
				} else {
					new Notice("Please select some text first");
				}
			}
		});

		// Register context menu
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				const selection = editor.getSelection();
				if (selection) {
					menu.addItem((item) => {
						item
							.setTitle("Ask Claude about this")
							.setIcon("message-circle")
							.onClick(() => {
								new QuickAskModal(this.app, this, selection).open();
							});
					});
				}
			})
		);

		// Settings tab
		this.addSettingTab(new ClaudeAssistantSettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(CHAT_VIEW_TYPE);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.search?.updateSettings(this.settings);

		// Update chat view settings
		this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE).forEach(leaf => {
			if (leaf.view instanceof ChatView) {
				leaf.view.updateSettings(this.settings);
			}
		});
	}

	async activateChatView() {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0];

		if (!leaf) {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				await leaf.setViewState({
					type: CHAT_VIEW_TYPE,
					active: true,
				});
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async askAboutText(prompt: string, text: string) {
		await this.activateChatView();

		const leaf = this.app.workspace.getLeavesOfType(CHAT_VIEW_TYPE)[0];
		if (leaf && leaf.view instanceof ChatView) {
			await leaf.view.sendMessageToChat(prompt, text);
		}
	}

	async improveText(editor: Editor, text: string) {
		new Notice("Improving text...");

		try {
			const searchResults = await this.search.search(text);
			const context = this.search.formatContext(searchResults);

			const response = await sendMessage(
				"Improve this text. Fix grammar, improve clarity, and make it more professional. Return ONLY the improved text, no explanations.",
				context,
				this.settings,
				[{ role: "user", content: text }]
			);

			editor.replaceSelection(response);
			new Notice("Text improved!");
		} catch (error) {
			new Notice(`Error: ${error.message}`);
		}
	}
}

class QuickAskModal extends Modal {
	private plugin: ClaudeAssistantPlugin;
	private selectedText?: string;

	constructor(app: App, plugin: ClaudeAssistantPlugin, selectedText?: string) {
		super(app);
		this.plugin = plugin;
		this.selectedText = selectedText;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h3", { text: "Ask Claude" });

		if (this.selectedText) {
			const preview = contentEl.createEl("div", { cls: "claude-selection-preview" });
			preview.createEl("strong", { text: "Selected text:" });
			preview.createEl("p", { text: this.selectedText.substring(0, 200) + (this.selectedText.length > 200 ? "..." : "") });
		}

		const inputEl = contentEl.createEl("textarea", {
			cls: "claude-quick-input",
			attr: { placeholder: this.selectedText ? "What would you like to know about this?" : "Ask anything..." }
		});

		inputEl.style.width = "100%";
		inputEl.style.height = "100px";
		inputEl.style.marginTop = "10px";

		const buttonContainer = contentEl.createEl("div", { cls: "claude-modal-buttons" });
		buttonContainer.style.marginTop = "10px";
		buttonContainer.style.display = "flex";
		buttonContainer.style.justifyContent = "flex-end";
		buttonContainer.style.gap = "10px";

		const cancelBtn = buttonContainer.createEl("button", { text: "Cancel" });
		cancelBtn.onclick = () => this.close();

		const askBtn = buttonContainer.createEl("button", { text: "Ask", cls: "mod-cta" });
		askBtn.onclick = async () => {
			const question = inputEl.value.trim();
			if (question) {
				this.close();
				await this.plugin.askAboutText(question, this.selectedText || "");
			}
		};

		inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && e.ctrlKey) {
				askBtn.click();
			}
		});

		inputEl.focus();
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
