# Jupyter Notebook Markdown 英译汉扩展

一个 VSCode 扩展，用于将 Jupyter Notebook (.ipynb) 文件中的英文 Markdown 单元格自动翻译成中文。

[![Version](https://img.shields.io/badge/version-0.3.0-blue.svg)](https://github.com/Zhou-Ruichen/Notebook-Translate/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ 功能特性（V0.3.0）

- 🔐 **安全存储 (Security)**: API Key 不再明文存储，集成 VSCode Keychain 安全管理 🆕
- 🗂️ **多配置管理 (Profiles)**: 支持保存多套翻译配置（OpenAI, Ollama, 百度），一键切换 🆕
- 🧠 **推理模型支持**: 完美支持 DeepSeek R1 等推理模型，自动清洗 `<think>` 思维链内容 🆕
- ✅ **智能缓存**: 避免重复翻译，节省 Token
- ✅ **双语对照**: 支持保留原文（`bilingual`）或直接替换（`replace`）

## 📦 安装

1. 从 [Releases](https://github.com/Zhou-Ruichen/Notebook-Translate/releases) 下载最新的 `.vsix` 文件
2. 在 VSCode 中：**扩展** → **更多操作(···)** → **从 VSIX 安装**

## 🚀 使用方法

### 1. 快速开始
打开 `.ipynb` 文件，点击状态栏右下角的 `$(globe) ProfileName` 图标，或使用命令面板：

1. `Cmd+Shift+P` -> 输入 `IPynb Translator: Add Profile` 创建配置。
2. 输入 `IPynb Translator: Translate Notebook` 开始翻译。

### 2. 管理配置 (Profiles)

v0.3.0 引入了 Profile 系统，推荐使用 **命令面板** 进行管理，而不是手动编辑 JSON。

- **添加配置**: `IPynb Translator: Add Profile`
- **切换配置**: `IPynb Translator: Select Profile` (或点击状态栏)
- **设置密钥**: `IPynb Translator: Set API Key` (安全存储)

### 3. 配置示例 (`settings.json`)

虽然推荐使用 UI，但你也可以在 `settings.json` 中预设 Profile 结构（**注意：不要填写 sensitive keys**）。

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

## 🔐 安全与隐私

**API Key 去哪了？**
为了安全，v0.3.0 不再将 `apiKey` 或 `secretKey` 保存在 `settings.json` 中。
- **存储**: 密钥存储在操作系统的安全钥匙串 (Keychain) 中。
- **设置**: 使用命令 `IPynb Translator: Set API Key` 进行设置。
- **删除**: 再次运行设置命令，留空并回车即可删除密钥。

## 📝 详细配置项

| 配置项 | 说明 |
|--------|------|
| `ipynbTranslator.profiles` | 翻译配置列表 (Array) |
| `ipynbTranslator.activeProfile` | 当前激活的配置名称 (自动管理，勿手改) |
| `ipynbTranslator.translationMode` | 翻译模式：`bilingual` (双语) 或 `replace` (替换) |
| `ipynbTranslator.enableStatsLogging` | 是否记录翻译统计到 `.vscode/translator-stats.jsonl` |

## 📖 文档

- [V0.3 技术文档 (Architecture)](docs/V0.3-SUMMARY.md) 🆕
- [V0.2 技术文档](docs/V0.2-SUMMARY.md)
- [V0.1 技术文档](docs/V0.1-SUMMARY.md)

## 🔮 未来计划

- [ ] 支持更多厂商（Google, DeepL）
- [ ] 批量翻译多个文件
- [ ] 术语表支持

## 🤝 贡献与反馈

欢迎提交 [Issue](https://github.com/Zhou-Ruichen/Notebook-Translate/issues) 或 Pull Request！

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！**
