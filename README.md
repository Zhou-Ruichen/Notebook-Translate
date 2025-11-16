# Jupyter Notebook Markdown 英译汉扩展

一个 VSCode 扩展，用于将 Jupyter Notebook (.ipynb) 文件中的英文 Markdown 单元格自动翻译成中文。

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/Zhou-Ruichen/Notebook-Translate/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ 当前功能（V0.1.0）

- ✅ 一键翻译 Notebook 中的所有英文 Markdown 单元格
- ✅ 自动跳过已包含中文的单元格
- ✅ **双语对照模式**：默认保留原文在 HTML 注释中，方便对比
- ✅ 支持两种翻译引擎：
  - **Mock 翻译**：用于调试和测试（无需配置）
  - **OpenAI 翻译**：使用 GPT 模型进行真实翻译
- ✅ 进度显示和取消支持
- ✅ 完整的错误处理
- ✅ 优化的技术文档翻译提示词

## 📦 安装

### 方式一：下载安装（推荐）

1. 从 [Releases](https://github.com/Zhou-Ruichen/Notebook-Translate/releases) 下载最新的 `.vsix` 文件
2. 在 VSCode 中：**扩展** → **更多操作(···)** → **从 VSIX 安装**
3. 选择下载的文件

### 方式二：从源码安装（开发者）

```bash
git clone https://github.com/Zhou-Ruichen/Notebook-Translate.git
cd Notebook-Translate
npm install
npm run compile
# 按 F5 启动调试
```

## 🚀 使用方法

### 基本使用

1. 在 VSCode 中打开一个 `.ipynb` 文件
2. 按 `Cmd+Shift+P`（Mac）或 `Ctrl+Shift+P`（Windows/Linux）
3. 输入：`翻译 Notebook Markdown 单元格（英译汉）`
4. 执行命令，等待翻译完成

### 配置 OpenAI（可选）

默认使用 Mock 模式（无需配置）。如需真实翻译：

1. 打开 VSCode 设置（`Cmd+,` 或 `Ctrl+,`）
2. 搜索 `ipynbTranslator`
3. 配置：

```json
{
  "ipynbTranslator.engine": "openai",
  "ipynbTranslator.openai.apiKey": "你的-API-Key",
  "ipynbTranslator.openai.model": "gpt-4o-mini",
  "ipynbTranslator.openai.baseUrl": "https://api.openai.com/v1"
}
```

### 翻译模式

- **`bilingual`（默认）**：双语对照，原文保留在 HTML 注释中
  ```markdown
  <!-- Original English:
  # Introduction to Data Science
  -->
  
  # 数据科学简介
  ```

- **`replace`**：直接替换为译文

配置：
```json
{
  "ipynbTranslator.translationMode": "bilingual"  // 或 "replace"
}
```

## 📝 配置项说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `ipynbTranslator.engine` | string | `mock` | 翻译引擎：`mock` 或 `openai` |
| `ipynbTranslator.translationMode` | string | `bilingual` | 翻译模式：`bilingual` 或 `replace` |
| `ipynbTranslator.openai.apiKey` | string | - | OpenAI API 密钥 |
| `ipynbTranslator.openai.model` | string | `gpt-4o-mini` | 模型名称 |
| `ipynbTranslator.openai.baseUrl` | string | `https://api.openai.com/v1` | API 端点（支持代理） |

## 🎯 工作原理

1. 检测当前是否是 Notebook 文件
2. 遍历所有 Markdown 单元格
3. 使用正则表达式检测是否包含中文，如包含则跳过
4. 调用选择的翻译引擎进行翻译
5. 根据翻译模式格式化结果
6. 使用 VSCode Notebook API 更新单元格内容

## 📖 文档

- [使用指南](USAGE.md)：详细的使用说明和配置指南
- [快速开始](QUICKSTART.md)：快速测试和开发指南
- [技术文档](V0.1-SUMMARY.md)：实现细节和架构说明

## 🔮 未来计划

以下功能计划在后续版本中实现：

### 计划中的功能
- [ ] 支持更多翻译引擎（百度、有道、Google 等）
- [ ] 支持批量翻译多个 Notebook 文件
- [ ] 支持选择性翻译（指定单元格范围）
- [ ] 翻译历史记录和回滚功能
- [ ] 自定义翻译提示词配置
- [ ] 术语表和翻译记忆库
- [ ] 翻译质量评估
- [ ] 支持更多语言对（中译英、日译中等）

欢迎在 [Issues](https://github.com/Zhou-Ruichen/Notebook-Translate/issues) 中提出建议！

## ⚠️ 注意事项

1. **备份数据**：翻译会修改原文件，建议先备份
2. **API 费用**：使用 OpenAI 翻译会产生 API 调用费用
3. **网络要求**：OpenAI 模式需要网络连接
4. **格式保留**：翻译器会尽力保留 Markdown 格式，但可能不完美

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📮 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](https://github.com/Zhou-Ruichen/Notebook-Translate/issues)
- Pull Request

---

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！**

