# Jupyter Notebook Markdown EN→ZH Translator

A VSCode extension that translates English Markdown cells in Jupyter Notebook (`.ipynb`) files into Chinese.

[![Version](https://img.shields.io/badge/version-0.4.0-blue.svg)](https://github.com/Zhou-Ruichen/Notebook-Translate/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![中文文档](https://img.shields.io/badge/docs-中文-blue.svg)](README.md)

## ✨ Features

- 🔐 **Key isolation**: API keys live in the OS keychain via VSCode SecretStorage, never in `settings.json`.
- 🗂️ **Multi-profile**: keep OpenAI-compatible, Ollama, and Baidu configs side by side; manage them in an activity-bar panel.
- 🧠 **Reasoning models**: `<think>…</think>` chain-of-thought from models like DeepSeek R1 is stripped, leaving only the translation.
- 📡 **Streaming translation** (v0.4 🆕): OpenAI/Ollama stream token by token; press Esc to cancel mid-translation and keep the cells already done. Baidu uses request/response.
- 🗂️ **Webview panel** (v0.4 🆕): profile management moved from the command-palette wizard to a persistent activity-bar view, with connection testing and rollback on failure.
- ✅ **Caching**: identical content is not re-requested, saving tokens.
- ✅ **Bilingual / replace**: `bilingual` keeps the original in an HTML comment, `replace` overwrites it.

## 📦 Installation

Requires VSCode 1.90 or newer (needs the Node 18 extension host).

1. Download the `.vsix` from [Releases](https://github.com/Zhou-Ruichen/Notebook-Translate/releases).
2. In VSCode: **Extensions** → **More Actions (···)** → **Install from VSIX**.

## 🚀 Usage

### 1. Translate

Open a `.ipynb` file and run `IPynb Translator: Translate Notebook` from the command palette. The bottom-right status bar shows the active profile and is clickable to switch. A progress bar is shown and the run is cancellable.

### 2. Manage profiles

In v0.4 profile management is an activity-bar panel (the translate icon in the left sidebar). Run `IPynb Translator: Manage Profiles` to open it, or click the activity-bar icon directly.

- New: click `$(add)` in the view title bar and fill the form.
- Activate: click Activate on a profile to run a connection test; on failure it rolls back to the last working profile.
- Test: click Test to check connectivity without changing the active profile.
- Delete: removes the profile and its key together.
- Keys: typed into a password field and stored in the keychain; the panel shows only "has key / no key", never the plaintext. Stored keys can be cleared with the "clear stored key" button.

### 3. Configuration example (`settings.json`)

The panel is recommended. You can also preset profile structure in `settings.json`; **do not put keys here**.

```json
"ipynbTranslator.profiles": [
  {
    "name": "My OpenAI",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "baseUrl": "https://api.openai.com/v1",
    "customPrompt": "Translate to Chinese (Technical)"
  },
  {
    "name": "Local DeepSeek",
    "provider": "ollama",
    "model": "deepseek-r1",
    "endpoint": "http://localhost:11434"
  }
]
```

## 🔐 Security

Since `v0.3.0`, keys are not written to `settings.json`:

- **Storage**: via VSCode SecretStorage into the OS keychain.
- **Writing**: set when creating/editing a profile in the panel, or stored on its own.
- **Clearing**: deleting a profile removes its key; the edit view also has a standalone "clear stored key" action.
- **Provider change**: switching a profile's provider type clears the old key, so secrets are not reused across providers.
- **Rollback**: if activating a new profile fails (unreachable, wrong key), it reverts automatically.

## 📝 Configuration reference

| Option | Description |
|--------|-------------|
| `ipynbTranslator.profiles` | List of translation profiles (Array). |
| `ipynbTranslator.activeProfile` | Name of the active profile (auto-managed; do not edit manually). |
| `ipynbTranslator.translationMode` | `bilingual` (keep original) or `replace` (overwrite original). |
| `ipynbTranslator.enableStatsLogging` | Whether to append per-translation latency/char count to `.vscode/translator-stats.jsonl`. |

## 📖 Documentation

- [V0.3 architecture notes (incl. v0.3.1 patch)](docs/V0.3-SUMMARY.md)
- [V0.2 technical notes](docs/V0.2-SUMMARY.md)
- [V0.1 technical notes](docs/V0.1-SUMMARY.md)

## 🔮 Roadmap

- [ ] Support more providers (Google, DeepL).
- [ ] Batch-translate multiple notebooks.
- [ ] Glossary overrides.

## 🤝 Contributing

Issues and pull requests are welcome at the [issue tracker](https://github.com/Zhou-Ruichen/Notebook-Translate/issues).

**If this extension is useful to you, a ⭐️ star is appreciated.**
