# Jupyter Notebook Markdown 英译汉

这个VSCode扩展允许你将Jupyter Notebook (.ipynb)文件中的英文Markdown单元格翻译成中文。支持多种翻译引擎，包括传统翻译API（百度、有道、Google）和大模型API（OpenAI、Azure OpenAI）。

## 功能

- 一键翻译当前打开的Jupyter Notebook中的所有英文Markdown单元格
- 支持多种翻译引擎：
  - 百度翻译API
  - 有道翻译API
  - Google翻译API
  - OpenAI (GPT) API
  - Azure OpenAI API
  - 模拟翻译（测试用）
- 自定义翻译配置，包括API密钥、模型选择和提示词设置
- 自动检测单元格语言，只翻译英文单元格
- 保留原始格式和Markdown标记
- 翻译进度指示器，支持取消操作

## 使用方法

### 基本操作

1. 在VSCode中打开一个.ipynb文件
2. 通过以下任一方式运行翻译命令：
   - 右键单击编辑器，在上下文菜单中选择"翻译Notebook Markdown单元格 (英译汉)"
   - 按下Ctrl+Shift+P打开命令面板，输入并选择"翻译Notebook Markdown单元格 (英译汉)"
3. 在弹出的选择框中选择要使用的翻译引擎
4. 如果是首次使用所选引擎，系统会提示输入相关API配置信息
5. 等待翻译完成

### 配置翻译引擎

1. 通过以下任一方式打开配置界面：
   - 右键单击编辑器，在上下文菜单中选择"配置Notebook Markdown翻译引擎"
   - 按下Ctrl+Shift+P打开命令面板，输入并选择"配置Notebook Markdown翻译引擎"
2. 选择要配置的翻译引擎
3. 根据提示输入相关配置信息

### 手动修改设置

你也可以直接在VSCode的设置中修改配置：

1. 打开VSCode设置（文件 > 首选项 > 设置，或按Ctrl+,）
2. 搜索"ipynbTranslator"
3. 调整相关设置

## 翻译引擎配置指南

### 百度翻译

需要在[百度翻译开放平台](http://api.fanyi.baidu.com/)注册并创建应用，获取APPID和密钥。

配置项：
- APPID: 应用ID
- 密钥: 应用密钥

### 有道翻译

需要在[有道智云](https://ai.youdao.com/)注册并创建应用，获取应用ID和应用密钥。

配置项：
- 应用ID: 应用的ID
- 应用密钥: 应用的密钥

### Google翻译

需要在[Google Cloud Platform](https://console.cloud.google.com/)创建项目，启用Cloud Translation API，并生成API密钥。

配置项：
- API密钥: Google Cloud API密钥

### OpenAI (GPT)

需要在[OpenAI平台](https://platform.openai.com/)注册账号并获取API密钥。

配置项：
- API密钥: OpenAI API密钥
- 模型: 使用的模型，如"gpt-3.5-turbo"、"gpt-4"等
- 提示词: 引导大模型进行翻译的提示词
- API端点: API请求的URL（可选，用于自定义API代理）

### Azure OpenAI

需要在[Azure Portal](https://portal.azure.com/)创建Azure OpenAI资源，并部署相应的模型。

配置项：
- API密钥: Azure OpenAI API密钥
- 部署ID: 模型部署的ID
- API端点: Azure OpenAI服务的端点URL
- 提示词: 引导大模型进行翻译的提示词

## 提示词示例

以下是一些针对大模型翻译的提示词示例：

### 基础翻译提示词
```
请将以下英文Markdown内容翻译成中文，保持所有的Markdown格式和标签不变：
```

### 学术翻译提示词
```
请将以下英文Markdown内容翻译成中文，这是一篇学术论文的内容，请使用恰当的学术用语进行翻译，保持所有的Markdown格式和标签不变：
```

### 技术文档提示词
```
你是一位精通编程和技术文档翻译的专家。请将以下英文Markdown内容翻译成中文，这是一篇技术文档，包含代码示例和技术术语，请准确翻译术语并保持代码块不变，同时保持所有的Markdown格式和标签不变：
```

## 安装方法

### 从VSIX文件安装

1. 下载插件的VSIX文件
2. 在VSCode中，点击扩展视图图标
3. 点击"..."菜单，选择"从VSIX安装..."
4. 选择下载的VSIX文件

### 从源代码安装

1. 克隆这个仓库
2. 在项目根目录运行`npm install`
3. 运行`npm run compile`
4. 按下F5开始调试

## 注意事项

- 翻译会直接修改当前文件，建议在翻译前备份原始文件
- 若单元格已包含中文内容，将跳过翻译
- 大模型翻译通常更适合保留原始格式，但可能会有更长的响应时间
- 提示词对大模型翻译质量有重要影响，可以根据需要进行调整

## 待添加功能

- [ ] 记忆上次选择的翻译引擎
- [ ] 支持翻译选定的单元格而非整个文件
- [ ] 添加翻译历史记录
- [ ] 支持自定义翻译规则和术语表
- [ ] 添加批量处理多个文件的功能
- [ ] 添加翻译质量评估功能
- [ ] 支持更多大模型服务提供商
