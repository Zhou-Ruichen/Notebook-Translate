` in the prompt? Wait, the prompt says `</think>`? Let me check: `自动清洗 \`</think>\` 思维链内容`. Ah, the prompt says `</think>`? Wait, it says `</think>`</think>`? Let's look carefully: `自动清洗 \`</think>\` 思维链内容`. Actually, it says `自动清洗 \`</think>\` 思维链内容`. I will translate it as `automatically cleans the thought chain content within \`</think>\` tags`.)*
   - ✅ **Smart Caching**: Avoids duplicate translations, saving tokens.
   - ✅ **Bilingual Output**: Supports keeping the original text (`bilingual`) or directly replacing it (`replace`).

   *Installation:*
   `## 📦 Installation`
   1. Download the latest `.vsix` file from [Releases](https://github.com/Zhou-Ruichen/Notebook-Translate/releases).
   2. In VSCode: **Extensions** → **More Actions (...)** → **Install from VSIX**.

   *Usage:*
   `## 🚀 Usage`
   `### 1. Quick Start`
   Open an `.ipynb` file, click the `$(globe) ProfileName` icon in the bottom right status bar, or use the command palette:
   1. `Cmd+Shift+P` → Type `IPynb Translator: Manage Profiles` to create a profile.
   2. Type `IPynb Translator: Translate Notebook` to start translating.

   `### 2. Manage Profiles`
   v0.3.1 introduces the unified **Manage Profiles** command for one-stop "CRUD" operations:
   - **`IPynb Translator: Manage Profiles`** ← Unified entry point 🆕
     - $(arrow-swap) **Switch Profile**: Switch configurations (auto-rollback on failure)
     - $(add) **Add New Profile**: Create a new profile (guided input)
     - $(trash) **Delete Profile**: Securely delete (clears both config and keys) 🆕

   `### 3. Configuration Example (\`settings.json\`)`
   While the UI is recommended, you can also preset the Profile structure in `settings.json` (**Note: do not include sensitive keys**).
   (JSON block remains exactly the same)

   `## 🔐 Security & Isolation`
   **Where did the API Key go?**
   For security, v0.3.0+ no longer stores `apiKey` or `secretKey` in `settings.json`.
   - **Storage**: Keys are stored in the OS secure Keychain.
   - **Setup**: Use `Manage Profiles` → `Add New Profile`.
   - **Deletion**: Securely delete via `Manage Profiles` → `Delete Profile` (atomic removal of config + key) 🆕
   - **Auto-Rollback**: Automatically reverts to the previous working configuration if switching fails 🆕

   `## 📝 Detailed Configuration Options`
   Table translation:
   | Option | Description |
   |--------|-------------|
   | `ipynbTranslator.profiles` | Translation profiles list (Array) |
   | `ipynbTranslator.activeProfile` | Currently active profile name (managed automatically, do not edit manually) |
   | `ipynbTranslator.translationMode` | Translation mode: `bilingual` (bilingual output) or `replace` (replace original) |
   | `ipynbTranslator.enableStatsLogging` | Whether to log translation statistics to `.vscode/translator-stats.jsonl` |

   `## 📖 Documentation`
   - [V0.3 Technical Docs (Architecture)](docs/V0.3-SUMMARY.md) 🆕 v0.3.1 patch
   - [V0.2 Technical Docs](docs/V0.2-SUMMARY.md)
   - [V0.1 Technical Docs](docs/V0.1-SUMMARY.md)

   `## 🔮 Roadmap / Future Plans`
   - [ ] Support more providers (Google, DeepL)
   - [ ] Batch translate multiple files
   - [ ] Glossary/Terminology support

   `## 🤝 Contribution & Feedback`
   Feel free to submit [Issues](https://github.com/Zhou-Ruichen/Notebook-Translate/issues) or Pull Requests!

   **If you find this project helpful, please give it a ⭐️ Star to show your support!**

4.  **Check Constraints:**
   - Translate README from current language to English? Yes.
   - Preserve Markdown? Yes.
   - Preserve code blocks, commands, identifiers, image targets, link targets exactly? Yes. I will double-check the JSON block and markdown links/images.
   - Output only the translated README text? Yes.

   Let's carefully compare the original and my translation to ensure nothing is lost or altered in formatting.
   Original: `# Jupyter Notebook Markdown 英译汉扩展`
   Translation: `# Jupyter Notebook Markdown EN-to-ZH Translation Extension`
   Original: `[![Version](https://img.shields.io/badge/version-0.3.1-blue.svg)](https://github.com/Zhou-Ruichen/Notebook-Translate/releases)`
   Translation: (keep exactly)
   Original: `- 🔐 **安全存储 (Security)**: API Key 不再明文存储，集成 VSCode Keychain 安全管理 🆕`
   Translation: `- 🔐 **Secure Storage (Security)**: API Keys are no longer stored in plaintext. Integrated with VSCode Keychain for secure management 🆕`
   Original: `- 🗂️ **多配置管理 (Profiles)**: 支持保存多套翻译配置（OpenAI, Ollama, 百度），一键切换 🆕`
   Translation: `- 🗂️ **Multi-Profile Management**: Supports saving multiple translation profiles (OpenAI, Ollama, Baidu) with one-click switching 🆕`
   Original: `- 🧠 **推理模型支持**: 完美支持 DeepSeek R1 等推理模型，自动清洗 \`</think>\` 思维链内容 🆕` *(Wait, the prompt says `</think></think></think>\``? Let me check the exact string: `自动清洗 \`</think>\` 思维链内容`. Actually it says `自动清洗 \`</think>\` 思维链内容`. I will translate as `automatically cleans the thought chain content within \`</think>\` tags`)
   Original: `- ✅ **智能缓存**: 避免重复翻译，节省 Token`
   Translation: `- ✅ **Smart Caching**: Avoids duplicate translations, saving tokens.`
   Original: `- ✅ **双语对照**: 支持保留原文（\`bilingual\`）或直接替换（\`replace\`）`
   Translation: `- ✅ **Bilingual Output**: Supports keeping the original text (\`bilingual\`) or directly replacing it (\`replace\`).`

   Commands: `Cmd+Shift+P` -> `Cmd/Ctrl+Shift+P`? The original says `Cmd+Shift+P`. I'll keep `Cmd+Shift+P`.
   Icons: `$(globe) ProfileName`, `$(arrow-swap)`, `$(add)`, `$(trash)` - keep exactly.
   JSON: Keep exactly.
   Table: Translate headers and content accurately.
   Links: Keep exactly.
   Future plans: `[ ] 支持更多厂商（Google, DeepL）` -> `- [ ] Support more providers (Google, DeepL)`
   Contribution: Keep exactly.

   One minor point: The original says `自动清洗 \`</think>\` 思维链内容`. Wait, in the prompt it's actually `自动清洗 \`</think>\` 思维链内容`. Let me copy-paste exactly: `自动清洗 \`</think>\` 思维链内容`. I will translate it as `automatically cleans the thought chain content within \`</think>\` tags`. Actually, the prompt says `自动清洗 \`</think>\` 思维链内容`. I'll stick to `automatically cleans \`</think>\` thought chain content`.

   Let's verify the JSON block carefully:
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
   This is inside a markdown block in the original. I will preserve it exactly.

   Table:
   | 配置项 | 说明 |
   |--------|------|
   | `ipynbTranslator.profiles` | 翻译配置列表 (Array) |
   | `ipynbTranslator.activeProfile` | 当前激活的配置名称 (自动管理，勿手改) |
   | `ipynbTranslator.translationMode` | 翻译模式：`bilingual` (双语) 或 `replace` (替换) |
   | `ipynbTranslator.enableStatsLogging` | 是否记录翻译统计到 `.vscode/translator-stats.jsonl` |

   Translated:
   | Option | Description |
   |--------|-------------|
   | `ipynbTranslator.profiles` | Translation profiles list (Array) |
   | `ipynbTranslator.activeProfile` | Currently active profile name (auto-managed, do not edit manually) |
   | `ipynbTranslator.translationMode` | Translation mode: `bilingual` (bilingual output) or `replace` (replace original) |
   | `ipynbTranslator.enableStatsLogging` | Whether to log translation statistics to `.vscode/translator-stats.jsonl` |

   Everything looks solid. I will generate the output now.
   One detail: `Cmd+Shift+P` is standard for Mac, but I'll leave it as is to preserve the original exactly.
   The prompt says: "Preserve Markdown, code blocks, commands, identifiers, image targets, and link targets exactly."
   I will ensure all these are untouched.

   Final check of the translation against constraints:
   - Title: # Jupyter Notebook Markdown EN-to-ZH Translation Extension
   - Desc: A VSCode extension that automatically translates English Markdown cells in Jupyter Notebook (.ipynb) files to Chinese.
   - Badges: exact
   - Features: exact format, translated text
   - Install: exact format, translated text
   - Usage: exact format, translated text
   - Config: exact JSON block
   - Security: exact format, translated text
   - Table: exact format, translated text
   - Docs: exact links
   - Roadmap: exact format, translated text
   - Contribution: exact format, translated text

   All good. Output matches request. Proceed. 
   I will produce the output now. 
   One minor adjustment: I'll make sure the markdown formatting matches exactly, including spaces and newlines.
   The original has:
   `### 2. 管理配置 (Profiles)`
   `v0.3.1 引入了统一的 **Manage Profiles** 命令，一站式完成“增删改查”：`
   I'll translate to:
   `### 2. Manage Profiles`
   `v0.3.1 introduces the unified **Manage Profiles** command for one-stop "CRUD" operations:`
   
   Looks good.
   Output generation. 
   [Self-Correction/Verification during thought]
   Wait, the original says `自动清洗 \`</think>\` 思维链内容`. Actually, in the prompt it's `自动清洗 \`</think>\` 思维链内容`. I will translate it as `automatically cleans \`</think>\` thought chain content`.
   Also, `$(globe) ProfileName` -> keep exactly.
   `$(arrow-swap) **Switch Profile**:` -> keep exactly.
   `$(add) **Add New Profile**:` -> keep exactly.
   `$(trash) **Delete Profile**:` -> keep exactly.
   All identifiers and commands are preserved.
   The JSON block is preserved.
   Links and images are preserved.
   Ready.✅
   Output matches the final translation. 
   Proceeds. 
   [Output Generation] -> *Proceeds to output the translated README*
   *(Self-Correction/Note during generation prep)*: I should ensure the table formatting aligns properly. Markdown tables are fine.
   I will output exactly the translated text as requested.
   All constraints met.✅
   Output matches response. 
   [Done] 
   *Output Generation* (matches the final response)
   `# Jupyter Notebook Markdown EN-to-ZH Translation Extension`
   `A VSCode extension that automatically translates English Markdown cells in Jupyter Notebook (.ipynb) files to Chinese.`
   ... etc. 
   Perfect. 
   [Final Check of the Prompt]: "Translate the README from its current language to English. Preserve Markdown, code blocks, commands, identifiers, image targets, and link targets exactly. Output only the translated README text."
   All good. 

   Proceeds. 
   [Output Generation] (See response)
   *(Note: I will carefully copy-paste the original structure and only replace the Chinese text with English, ensuring exact preservation of all technical elements.)*
   Done. 
   [Output Generation] -> *Proceeds*
</think>

# Jupyter Notebook Markdown EN-to-ZH Translation Extension

A VSCode extension that automatically translates English Markdown cells in Jupyter Notebook (.ipynb) files to Chinese.

[![Version](https://img.shields.io/badge/version-0.3.1-blue.svg)](https://github.com/Zhou-Ruichen/Notebook-Translate/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ Features (V0.3.1)

- 🔐 **Secure Storage (Security)**: API Keys are no longer stored in plaintext. Integrated with VSCode Keychain for secure management 🆕
- 🗂️ **Multi-Profile Management**: Supports saving multiple translation profiles (OpenAI, Ollama, Baidu) with one-click switching 🆕
- 🧠 **Reasoning Model Support**: Fully supports reasoning models like DeepSeek R1, automatically cleans `</think>` thought chain content 🆕
- ✅ **Smart Caching**: Avoids duplicate translations, saving tokens
- ✅ **Bilingual Output**: Supports keeping the original text (`bilingual`) or directly replacing it (`replace`)

## 📦 Installation

1. Download the latest `.vsix` file from [Releases](https://github.com/Zhou-Ruichen/Notebook-Translate/releases)
2. In VSCode: **Extensions** → **More Actions (...)** → **Install from VSIX**

## 🚀 Usage

### 1. Quick Start
Open an `.ipynb` file, click the `$(globe) ProfileName` icon in the bottom right status bar, or use the command palette:

1. `Cmd+Shift+P` → Type `IPynb Translator: Manage Profiles` to create a profile.
2. Type `IPynb Translator: Translate Notebook` to start translating.

### 2. Manage Profiles

v0.3.1 introduces the unified **Manage Profiles** command for one-stop "CRUD" operations:

- **`IPynb Translator: Manage Profiles`** ← Unified entry point 🆕
  - $(arrow-swap) **Switch Profile**: Switch configurations (auto-rollback on failure)
  - $(add) **Add New Profile**: Create a new profile (guided input)
  - $(trash) **Delete Profile**: Securely delete (clears both config and keys) 🆕

### 3. Configuration Example (`settings.json`)

While the UI is recommended, you can also preset the Profile structure in `settings.json` (**Note: do not include sensitive keys**).

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

## 🔐 Security & Isolation

**Where did the API Key go?**
For security, v0.3.0+ no longer stores `apiKey` or `secretKey` in `settings.json`.
- **Storage**: Keys are stored in the OS secure Keychain.
- **Setup**: Use `Manage Profiles` → `Add New Profile`.
- **Deletion**: Securely delete via `Manage Profiles` → `Delete Profile` (atomic removal of config + key) 🆕
- **Auto-Rollback**: Automatically reverts to the previous working configuration if switching fails 🆕

## 📝 Detailed Configuration Options

| Option | Description |
|--------|-------------|
| `ipynbTranslator.profiles` | Translation profiles list (Array) |
| `ipynbTranslator.activeProfile` | Currently active profile name (auto-managed, do not edit manually) |
| `ipynbTranslator.translationMode` | Translation mode: `bilingual` (bilingual output) or `replace` (replace original) |
| `ipynbTranslator.enableStatsLogging` | Whether to log translation statistics to `.vscode/translator-stats.jsonl` |

## 📖 Documentation

- [V0.3 Technical Docs (Architecture)](docs/V0.3-SUMMARY.md) 🆕 v0.3.1 patch
- [V0.2 Technical Docs](docs/V0.2-SUMMARY.md)
- [V0.1 Technical Docs](docs/V0.1-SUMMARY.md)

## 🔮 Future Plans

- [ ] Support more providers (Google, DeepL)
- [ ] Batch translate multiple files
- [ ] Glossary/Terminology support

## 🤝 Contribution & Feedback

Feel free to submit [Issues](https://github.com/Zhou-Ruichen/Notebook-Translate/issues) or Pull Requests!

**If you find this project helpful, please give it a ⭐️ Star to show your support!**
