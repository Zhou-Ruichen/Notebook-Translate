# Jupyter Notebook Markdown 英译汉扩展

一个 VSCode 扩展，把 Jupyter Notebook (`.ipynb`) 里的英文 Markdown 单元格翻译成中文。

[![Version](https://img.shields.io/badge/version-0.4.0-blue.svg)](https://github.com/Zhou-Ruichen/Notebook-Translate/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![English](https://img.shields.io/badge/docs-English-blue.svg)](README.en-US.md)

## ✨ 功能特性

- 🔐 **密钥隔离**：API Key 存在系统钥匙串（VSCode SecretStorage），不写入 `settings.json`。
- 🗂️ **多 Profile 管理**：OpenAI 兼容、Ollama、百度三套配置并存，活动栏面板里增删改查。
- 🧠 **推理模型**：DeepSeek R1 等模型的 `<think>…</think>` 思维链会自动剥离，只留译文。
- 📡 **流式翻译**（v0.4 🆕）：OpenAI/Ollama 边出边收，可中途 Esc 取消，已完成单元格保留。百度走请求/响应。
- 🗂️ **Webview 面板**（v0.4 🆕）：Profile 管理从命令面板向导改成活动栏常驻面板，带连接测试和失败回滚。
- ✅ **缓存**：相同内容不重复请求，省 Token。
- ✅ **双语 / 替换**：`bilingual` 把原文放 HTML 注释里，`replace` 直接覆盖。

## 📦 安装

需要 VSCode 1.90 或以上（依赖扩展宿主的 Node 18）。

1. 从 [Releases](https://github.com/Zhou-Ruichen/Notebook-Translate/releases) 下载 `.vsix`。
2. VSCode 里 **扩展** → **更多操作(···)** → **从 VSIX 安装**。

## 🚀 使用方法

### 1. 翻译

打开 `.ipynb`，命令面板运行 `IPynb Translator: Translate Notebook`。状态栏右下角显示当前 Profile，可点击切换。带进度条，可取消。

### 2. 管理 Profile

v0.4 把 Profile 管理做成了活动栏面板（左侧边栏的翻译图标）。命令面板运行 `IPynb Translator: Manage Profiles` 可打开它，或直接点活动栏图标。

- 新建：点视图标题栏的 `$(add)`，按表单填。
- 激活：点某个 Profile 的 Activate，会自动测连接；失败回滚到上一个可用配置。
- 测试：点 Test 只验证连通性，不改当前激活项。
- 删除：连配置带密钥一起清除。
- 密钥：在密码框里填，存到钥匙串；面板只显示「有/无 Key」，不回显明文。已存的 key 可用「清除已存密钥」按钮删除。

### 3. 配置示例 (`settings.json`)

推荐用面板。也可以在 `settings.json` 里预设 Profile 结构，**密钥不要写在这里**。

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

## 🔐 安全

`v0.3.0+` 起密钥不再写进 `settings.json`：

- **存储**：经 VSCode SecretStorage 存到系统钥匙串。
- **写入**：面板里新建/编辑 Profile 时填，或单独存。
- **清除**：删除 Profile 时连密钥一起删；也可在编辑界面单独「清除已存密钥」。
- **provider 切换**：改 Profile 的 provider 类型会清掉旧密钥，避免串用。
- **回滚**：激活新 Profile 失败（连不上、key 错）时自动回退。

## 📝 配置项

| 配置项 | 说明 |
|--------|------|
| `ipynbTranslator.profiles` | 翻译配置列表（数组）。 |
| `ipynbTranslator.activeProfile` | 当前激活的 Profile 名（自动管理，勿手改）。 |
| `ipynbTranslator.translationMode` | `bilingual`（保留原文）或 `replace`（覆盖原文）。 |
| `ipynbTranslator.enableStatsLogging` | 是否把每次翻译的耗时/字数写到 `.vscode/translator-stats.jsonl`。 |

## 📖 文档

- [V0.3 技术文档（含 v0.3.1 补丁）](docs/V0.3-SUMMARY.md)
- [V0.2 技术文档](docs/V0.2-SUMMARY.md)
- [V0.1 技术文档](docs/V0.1-SUMMARY.md)

## 🔮 计划

- [ ] 支持更多厂商（Google, DeepL）。
- [ ] 批量翻译多个文件。
- [ ] 术语表覆盖。

## 🤝 贡献

欢迎提 [Issue](https://github.com/Zhou-Ruichen/Notebook-Translate/issues) 或 Pull Request。

**觉得有用的话，给个 ⭐️ Star。**
