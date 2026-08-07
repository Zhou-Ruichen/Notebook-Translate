# Jupyter Notebook Markdown EN→ZH Translator

A VSCode extension that translates English Markdown cells in Jupyter Notebook (`.ipynb`) files into Chinese.

[![Version](https://img.shields.io/badge/version-0.3.1-blue.svg)](https://github.com/Zhou-Ruichen/Notebook-Translate/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![中文文档](https://img.shields.io/badge/docs-中文-blue.svg)](README.md)

## ✨ Features (V0.3.1)

- 🔐 **Secure storage**: API keys are no longer stored in plaintext. Keys live in the OS keychain via the VSCode SecretStorage API. 🆕
- 🗂️ **Multi-profile management**: Save multiple translation profiles (OpenAI-compatible, Ollama, Baidu) and switch with one click. 🆕
- 🧠 **Reasoning-model support**: Works with reasoning models such as DeepSeek R1 and automatically strips `<think>…</think>` chain-of-thought output. 🆕
- ✅ **Smart caching**: Avoids re-translating identical content, saving tokens.
- ✅ **Bilingual output**: Keep the original alongside the translation (`bilingual`), or replace it in place (`replace`).

## 📦 Installation

1. Download the latest `.vsix` from [Releases](https://github.com/Zhou-Ruichen/Notebook-Translate/releases).
2. In VSCode: **Extensions** → **More Actions (···)** → **Install from VSIX**.

## 🚀 Usage

### 1. Quick start

Open a `.ipynb` file, then either click the `$(globe) ProfileName` icon in the bottom-right status bar, or use the command palette:

1. `Cmd/Ctrl+Shift+P` → run `IPynb Translator: Manage Profiles` to create a profile.
2. Run `IPynb Translator: Translate Notebook` to start translating.

### 2. Manage profiles

v0.3.1 introduces a unified **Manage Profiles** command that covers switch / add / delete in one place:

- **`IPynb Translator: Manage Profiles`** ← unified entry point 🆕
  - $(arrow-swap) **Switch Profile**: activate another profile (auto-rolls back on failure).
  - $(add) **Add New Profile**: create a new profile through a guided wizard.
  - $(trash) **Delete Profile**: remove a profile and wipe its key atomically. 🆕

### 3. Configuration example (`settings.json`)

The UI is recommended, but you can also preset profile structure in `settings.json`. **Do not put sensitive keys here** — they belong in the keychain.

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

## 🔐 Security & isolation

**Where do the API keys go?**
For security, v0.3.0+ no longer writes `apiKey` or `secretKey` into `settings.json`.

- **Storage**: keys are stored in the OS keychain via the VSCode SecretStorage API.
- **Setup**: use `Manage Profiles` → `Add New Profile`.
- **Deletion**: `Manage Profiles` → `Delete Profile` removes both the settings entry and the stored key. 🆕
- **Auto-rollback**: if a profile switch fails its connection test, the extension reverts to the previous working profile. 🆕

## 📝 Configuration reference

| Option | Description |
|--------|-------------|
| `ipynbTranslator.profiles` | List of translation profiles (Array). |
| `ipynbTranslator.activeProfile` | Name of the currently active profile (auto-managed; do not edit manually). |
| `ipynbTranslator.translationMode` | Output mode: `bilingual` (keep original) or `replace` (overwrite original). |
| `ipynbTranslator.enableStatsLogging` | Whether to append translation stats to `.vscode/translator-stats.jsonl`. |

## 📖 Documentation

- [V0.3 architecture notes (incl. v0.3.1 patch)](docs/V0.3-SUMMARY.md) 🆕
- [V0.2 technical notes](docs/V0.2-SUMMARY.md)
- [V0.1 technical notes](docs/V0.1-SUMMARY.md)

## 🔮 Roadmap

- [ ] Support more providers (Google, DeepL).
- [ ] Batch-translate multiple notebooks.
- [ ] Glossary / terminology overrides.

## 🤝 Contributing & feedback

Issues and pull requests are welcome at the [issue tracker](https://github.com/Zhou-Ruichen/Notebook-Translate/issues).

**If this extension is useful to you, a ⭐️ star on the repo is appreciated.**
