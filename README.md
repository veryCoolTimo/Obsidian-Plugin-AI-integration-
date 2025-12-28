# Timo Assistant for Obsidian

Personal AI assistant powered by Claude with smart context search across your vault.

## Features

- **Sidebar Chat** - Full chat interface in the right sidebar
- **Command Palette** - Quick access via `Cmd+P` → "Ask Claude"
- **Context Menu** - Right-click on selected text → "Ask Claude about this"
- **Smart Context Search** - Automatically finds relevant notes for context
- **Inline Actions** - Explain, summarize, or improve selected text

## Installation

### Manual Installation

1. Clone this repository into your vault's `.obsidian/plugins/` folder:
   ```bash
   cd /path/to/vault/.obsidian/plugins/
   git clone https://github.com/veryCoolTimo/Obsidian-Plugin-AI-integration-.git claude-assistant
   cd claude-assistant
   ```

2. Install dependencies and build:
   ```bash
   npm install
   npm run build
   ```

3. Enable the plugin in Obsidian Settings → Community Plugins

### Development

```bash
npm install
npm run dev
```

## Configuration

1. Get an API key from [OpenRouter](https://openrouter.ai/)
2. Open Obsidian Settings → Claude Assistant
3. Enter your API key
4. Configure model and other options

## Commands

| Command | Description |
|---------|-------------|
| Open Chat | Open the chat sidebar |
| Ask Claude | Quick prompt modal |
| Ask Claude about selection | Ask about selected text |
| Explain selection | Get explanation of selected text |
| Summarize selection | Summarize selected text |
| Improve writing | Improve selected text in-place |

## Keyboard Shortcuts

You can assign keyboard shortcuts to any command in Obsidian Settings → Hotkeys.

Recommended:
- `Cmd+Shift+C` - Open Chat
- `Cmd+Shift+A` - Ask Claude

## Models

Available models via OpenRouter:
- Claude Sonnet 4 (default, balanced)
- Claude Opus 4 (most capable)
- Claude Haiku (fastest)
- Claude 3.5 Sonnet

## License

MIT
