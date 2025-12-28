import { App, PluginSettingTab, Setting } from "obsidian";
import ClaudeAssistantPlugin from "./main";

export class ClaudeAssistantSettingTab extends PluginSettingTab {
	plugin: ClaudeAssistantPlugin;

	constructor(app: App, plugin: ClaudeAssistantPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Claude Assistant Settings" });

		// API Key
		new Setting(containerEl)
			.setName("OpenRouter API Key")
			.setDesc("Your OpenRouter API key for Claude access")
			.addText(text => text
				.setPlaceholder("sk-or-...")
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		// Model selection
		new Setting(containerEl)
			.setName("Model")
			.setDesc("Claude model to use")
			.addDropdown(dropdown => dropdown
				.addOption("anthropic/claude-sonnet-4", "Claude Sonnet 4")
				.addOption("anthropic/claude-opus-4", "Claude Opus 4")
				.addOption("anthropic/claude-haiku", "Claude Haiku")
				.addOption("anthropic/claude-3.5-sonnet", "Claude 3.5 Sonnet")
				.setValue(this.plugin.settings.model)
				.onChange(async (value) => {
					this.plugin.settings.model = value;
					await this.plugin.saveSettings();
				}));

		// Max tokens
		new Setting(containerEl)
			.setName("Max Tokens")
			.setDesc("Maximum tokens in response")
			.addSlider(slider => slider
				.setLimits(256, 8192, 256)
				.setValue(this.plugin.settings.maxTokens)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxTokens = value;
					await this.plugin.saveSettings();
				}));

		// Temperature
		new Setting(containerEl)
			.setName("Temperature")
			.setDesc("Creativity level (0 = focused, 1 = creative)")
			.addSlider(slider => slider
				.setLimits(0, 1, 0.1)
				.setValue(this.plugin.settings.temperature)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.temperature = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl("h3", { text: "Context Search" });

		// Max context notes
		new Setting(containerEl)
			.setName("Max Context Notes")
			.setDesc("Maximum number of notes to include as context")
			.addSlider(slider => slider
				.setLimits(1, 10, 1)
				.setValue(this.plugin.settings.maxContextNotes)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxContextNotes = value;
					await this.plugin.saveSettings();
				}));

		// Search threshold
		new Setting(containerEl)
			.setName("Search Threshold")
			.setDesc("Minimum relevance score for including a note (0-1)")
			.addSlider(slider => slider
				.setLimits(0, 1, 0.05)
				.setValue(this.plugin.settings.searchThreshold)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.searchThreshold = value;
					await this.plugin.saveSettings();
				}));

		containerEl.createEl("h3", { text: "System Prompt" });

		// System prompt
		new Setting(containerEl)
			.setName("System Prompt")
			.setDesc("Instructions for Claude")
			.addTextArea(text => text
				.setPlaceholder("You are a helpful assistant...")
				.setValue(this.plugin.settings.systemPrompt)
				.onChange(async (value) => {
					this.plugin.settings.systemPrompt = value;
					await this.plugin.saveSettings();
				}));

		// Make textarea larger
		const textArea = containerEl.querySelector("textarea");
		if (textArea) {
			textArea.style.width = "100%";
			textArea.style.height = "150px";
		}
	}
}
