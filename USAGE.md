# Jupyter Notebook Markdown 英译汉扩展 V0.1

## 功能说明

这是一个 VSCode 扩展，用于将 Jupyter Notebook (.ipynb) 文件中的英文 Markdown 单元格自动翻译成中文。

### V0.1 版本功能

- ✅ 翻译 Notebook 中的所有英文 Markdown 单元格
- ✅ 自动跳过已包含中文的单元格
- ✅ 支持两种翻译引擎：
  - **Mock**：模拟翻译（用于调试）
  - **OpenAI**：使用 OpenAI API 进行真实翻译
- ✅ 进度显示和取消支持
- ✅ 完整的错误处理

## 安装和使用

### 1. 安装依赖

```bash
npm install
```

### 2. 编译扩展

```bash
npm run compile
```

### 3. 调试运行

在 VSCode 中按 `F5` 启动调试，这会打开一个新的扩展开发窗口。

### 4. 使用扩展

1. 在新窗口中打开一个 `.ipynb` 文件
2. 打开命令面板（`Cmd+Shift+P` 或 `Ctrl+Shift+P`）
3. 输入并执行命令：`翻译 Notebook Markdown 单元格（英译汉）`
4. 等待翻译完成

## 配置

打开 VSCode 设置（`Cmd+,` 或 `Ctrl+,`），搜索 `ipynbTranslator`：

### 基本配置

- **ipynbTranslator.engine**: 选择翻译引擎
  - `mock`（默认）：模拟翻译，不需要任何配置
  - `openai`：使用 OpenAI API

### OpenAI 配置（仅在选择 openai 引擎时需要）

- **ipynbTranslator.openai.apiKey**: OpenAI API 密钥（必填）
- **ipynbTranslator.openai.model**: 模型名称（默认：`gpt-4o-mini`）
- **ipynbTranslator.openai.baseUrl**: API 基础 URL（默认：`https://api.openai.com/v1`）

### 配置示例

在 `settings.json` 中：

```json
{
  "ipynbTranslator.engine": "openai",
  "ipynbTranslator.openai.apiKey": "sk-your-api-key-here",
  "ipynbTranslator.openai.model": "gpt-4o-mini",
  "ipynbTranslator.openai.baseUrl": "https://api.openai.com/v1"
}
```

## 打包扩展

```bash
# 安装 vsce（如果还没有）
npm install -g @vscode/vsce

# 打包扩展
vsce package
```

这会生成一个 `.vsix` 文件，可以通过 VSCode 的 "从 VSIX 安装" 功能安装。

## 项目结构

```
.
├── package.json          # 扩展清单和配置
├── tsconfig.json         # TypeScript 配置
├── src/
│   ├── extension.ts      # 扩展主入口
│   ├── translator.ts     # 翻译器接口和实现
│   └── utils.ts          # 工具函数
└── out/                  # 编译输出目录
```

## 代码说明

### src/extension.ts

扩展的主入口文件，包含：
- `activate()`: 扩展激活函数，注册命令
- `translateNotebookMarkdown()`: 核心翻译逻辑
- `createTranslator()`: 根据配置创建翻译器实例

### src/translator.ts

翻译器接口和实现：
- `Translator` 接口：定义翻译器的统一接口
- `MockTranslator`: 模拟翻译器实现
- `OpenAITranslator`: OpenAI API 翻译器实现

### src/utils.ts

工具函数：
- `hasChinese()`: 检测文本是否包含中文字符

## 工作流程

1. 用户执行命令
2. 检查当前编辑器是否是 Notebook
3. 读取配置，创建翻译器实例
4. 获取所有 Markdown 单元格
5. 遍历单元格：
   - 检测是否包含中文，如果是则跳过
   - 如果是纯英文，调用翻译器翻译
   - 使用 WorkspaceEdit API 更新单元格内容
6. 显示进度和完成消息

## 注意事项

1. **Mock 模式**：默认使用 Mock 翻译器，只会在原文前添加 `[模拟翻译]` 标记，不会真正翻译
2. **OpenAI 模式**：需要配置有效的 API Key，会产生 API 调用费用
3. **中文检测**：使用简单的正则表达式检测中文字符（Unicode 范围 \u4e00-\u9fa5）
4. **保留格式**：翻译时会要求 AI 保留所有 Markdown 格式

## 后续版本规划

- [ ] 支持更多翻译引擎（百度、有道、Google 等）
- [ ] 支持批量翻译多个 Notebook
- [ ] 支持翻译历史记录和回滚
- [ ] 支持自定义翻译提示词
- [ ] 支持选择性翻译（指定单元格范围）
- [ ] 支持双语对照模式

## 许可证

MIT
