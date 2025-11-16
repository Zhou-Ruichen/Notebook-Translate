# 快速开始指南

## 立即测试扩展

### 方式 1：使用 F5 调试模式（推荐）

1. 在 VSCode 中打开此项目
2. 确保已安装依赖：`npm install`
3. 确保已编译：`npm run compile`
4. 按 `F5` 键启动调试
5. 在新打开的窗口中，打开 `test-notebook.ipynb`
6. 按 `Cmd+Shift+P`（Mac）或 `Ctrl+Shift+P`（Windows/Linux）
7. 输入：`翻译 Notebook Markdown 单元格（英译汉）`
8. 执行命令，观察效果

### 方式 2：打包并安装

```bash
# 安装打包工具
npm install -g @vscode/vsce

# 打包扩展
vsce package

# 会生成 ipynb-markdown-translator-0.1.0.vsix 文件
# 在 VSCode 中：扩展 -> 更多操作 -> 从 VSIX 安装
```

## 测试场景

### 场景 1：使用 Mock 翻译器（默认）

默认配置使用 Mock 翻译器，不需要任何 API Key。

1. 打开 `test-notebook.ipynb`
2. 执行翻译命令
3. 观察英文单元格前会添加 `[模拟翻译]` 标记
4. 包含中文的单元格会被跳过

### 场景 2：使用 OpenAI 翻译器

1. 打开 VSCode 设置
2. 搜索 `ipynbTranslator`
3. 设置：
   ```json
   {
     "ipynbTranslator.engine": "openai",
     "ipynbTranslator.openai.apiKey": "你的-API-Key",
     "ipynbTranslator.openai.model": "gpt-4o-mini"
   }
   ```
4. 打开 `test-notebook.ipynb`
5. 执行翻译命令
6. 英文单元格会被真正翻译成中文

## 预期结果

执行翻译后：

- ✅ 第 1 个 Markdown 单元格（Introduction...）会被翻译
- ⏩ 第 2 个是代码单元格，不处理
- ✅ 第 3 个 Markdown 单元格（What is Machine Learning...）会被翻译
- ⏩ 第 4 个 Markdown 单元格包含中文，会被跳过
- ✅ 第 5 个 Markdown 单元格（Getting Started...）会被翻译

最后会显示：`翻译完成！共翻译 3 个单元格，跳过 1 个单元格`

## 常见问题

### Q: 找不到命令怎么办？

A: 确保：
1. 扩展已经激活（查看输出面板）
2. 当前打开的是 `.ipynb` 文件
3. 重启 VSCode 试试

### Q: OpenAI 翻译失败？

A: 检查：
1. API Key 是否正确
2. 是否有网络连接
3. 查看 VSCode 开发者工具的控制台（帮助 -> 切换开发人员工具）

### Q: 翻译结果不理想？

A: V0.1 版本使用简单的提示词，后续版本会支持自定义提示词。

## 下一步

- 阅读 `USAGE.md` 了解详细使用说明
- 查看 `src/extension.ts` 了解核心逻辑
- 查看 `src/translator.ts` 了解如何添加新的翻译引擎
- 参与开发，添加更多功能！

## 开发模式

### 监听模式编译

```bash
npm run watch
```

这会在你修改代码时自动重新编译。修改代码后，在调试窗口按 `Cmd+R`（Mac）或 `Ctrl+R`（Windows/Linux）重新加载扩展。

### 调试技巧

1. 在代码中设置断点
2. 查看 `console.log` 输出（帮助 -> 切换开发人员工具）
3. 使用 VSCode 的调试控制台

祝使用愉快！🎉
