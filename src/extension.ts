/**
 * VSCode 扩展入口文件
 * Jupyter Notebook Markdown 英译汉扩展 V0.2
 */

import * as vscode from 'vscode';
import { hasChinese } from './utils';
import { Translator, MockTranslator, OpenAITranslator, OllamaTranslator, BaiduTranslator, formatTranslation, TranslationMode } from './translator';
import { TranslationCache } from './cache';
import { ProfileManager } from './profileManager';
import { TranslatorProfile, TranslationProvider } from './types';
import { migrateSettings } from './migration';
import { TranslationStats } from './statistics';
import { TranslatorStatusBar } from './statusBar';

// 全局实例
let profileManager: ProfileManager;
let stats: TranslationStats;
let statusBar: TranslatorStatusBar;

/**
 * 扩展激活函数
 * 当扩展被激活时调用（首次执行命令时）
 */
export async function activate(context: vscode.ExtensionContext) {
    console.log('扩展 "ipynb-translator" 已激活');

    // 执行配置迁移（如果有旧配置）
    await migrateSettings();

    // 初始化服务
    profileManager = new ProfileManager(context);
    stats = new TranslationStats();
    statusBar = new TranslatorStatusBar();

    // 更新初始状态
    statusBar.update(profileManager.getActiveProfileName(), 'ready');

    // 注册命令：翻译 Notebook Markdown 单元格（英译汉）
    const translateCmd = vscode.commands.registerCommand(
        'ipynbTranslator.translateMarkdownEnToZh',
        async () => {
            await translateNotebookMarkdown(context);
        }
    );

    // 注册命令：测试翻译引擎连接
    const testConnectionCmd = vscode.commands.registerCommand(
        'ipynbTranslator.testConnection',
        async () => {
            await testTranslatorConnection();
        }
    );

    // 注册命令：选择翻译配置
    const selectProfileCmd = vscode.commands.registerCommand(
        'ipynbTranslator.selectProfile',
        async () => {
            await selectProfile();
        }
    );

    // 注册命令：新建翻译配置
    const addProfileCmd = vscode.commands.registerCommand(
        'ipynbTranslator.addProfile',
        async () => {
            await addNewProfile();
        }
    );

    // 注册命令：清除所有翻译（可选功能）
    const cleanCmd = vscode.commands.registerCommand(
        'ipynbTranslator.cleanAllTranslations',
        () => {
            vscode.window.showInformationMessage('Clean Translations feature is coming soon.');
        }
    );

    context.subscriptions.push(translateCmd, testConnectionCmd, selectProfileCmd, addProfileCmd, cleanCmd);
}

/**
 * 扩展停用函数
 * 当扩展被停用时调用
 */
export function deactivate() {
    console.log('扩展 "ipynb-markdown-translator" 已停用');
}

/**
 * 翻译 Notebook Markdown 单元格的核心函数
 * @param context VSCode 扩展上下文（用于缓存）
 */
async function translateNotebookMarkdown(context: vscode.ExtensionContext) {
    // 1. 检查当前活动编辑器是否是 Notebook
    const notebookEditor = vscode.window.activeNotebookEditor;

    if (!notebookEditor) {
        vscode.window.showErrorMessage('请先打开一个 Jupyter Notebook (.ipynb) 文件');
        return;
    }

    const notebook = notebookEditor.notebook;

    // 2. 读取配置
    const config = vscode.workspace.getConfiguration('ipynbTranslator');
    const translationMode = config.get<TranslationMode>('translationMode', 'bilingual');

    // 3. 获取当前配置并创建翻译器实例
    profileManager.refresh();
    const activeProfile = profileManager.getActiveProfile();

    if (!activeProfile) {
        const action = await vscode.window.showWarningMessage(
            '尚未配置翻译服务，是否现在创建？',
            '创建配置'
        );
        if (action === '创建配置') {
            await vscode.commands.executeCommand('ipynbTranslator.addProfile');
        }
        return;
    }

    let translator: Translator;

    try {
        translator = await createTranslatorFromProfile(activeProfile);
    } catch (error) {
        if (error instanceof Error) {
            vscode.window.showErrorMessage(error.message);
        }
        return;
    }

    // 4. 获取所有 Markdown 单元格
    const markdownCells = notebook.getCells().filter(
        cell => cell.kind === vscode.NotebookCellKind.Markup
    );

    if (markdownCells.length === 0) {
        vscode.window.showInformationMessage('当前 Notebook 中没有 Markdown 单元格');
        return;
    }

    // 5. 使用进度条执行翻译
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: '翻译 Notebook Markdown (英→中)',
            cancellable: true
        },
        async (progress, token) => {
            const totalCells = markdownCells.length;
            let translatedCount = 0;
            let skippedCount = 0;
            let cachedCount = 0;

            // 初始化翻译缓存
            const cache = new TranslationCache(context);

            // 6. 遍历并翻译每个 Markdown 单元格
            for (let i = 0; i < markdownCells.length; i++) {
                // 检查是否取消
                if (token.isCancellationRequested) {
                    vscode.window.showWarningMessage('翻译已取消');
                    return;
                }

                const cell = markdownCells[i];
                const cellText = cell.document.getText();

                // 更新进度
                progress.report({
                    message: `处理中... (${i + 1}/${totalCells})`,
                    increment: (100 / totalCells)
                });

                // 7. 检测是否包含中文，如果包含则跳过
                if (hasChinese(cellText)) {
                    console.log(`单元格 ${i + 1} 包含中文，跳过翻译`);
                    skippedCount++;
                    continue;
                }

                // 8. 如果单元格为空或只有空白字符，跳过
                if (cellText.trim().length === 0) {
                    console.log(`单元格 ${i + 1} 为空，跳过翻译`);
                    skippedCount++;
                    continue;
                }

                try {
                    // 9. 检查缓存是否命中
                    const cachedTranslation = cache.get(cellText);
                    let translatedText: string;

                    if (cachedTranslation) {
                        // 缓存命中，直接使用缓存结果
                        console.log(`单元格 ${i + 1} 缓存命中`);
                        translatedText = cachedTranslation;
                        cachedCount++;
                    } else {
                        // 缓存未命中，调用翻译器翻译
                        const startTime = Date.now();
                        translatedText = await translator.translate(cellText);
                        const duration = Date.now() - startTime;

                        // 记录统计
                        stats.log({
                            model: activeProfile.provider === 'openai' ? (activeProfile as any).model : (activeProfile as any).model || 'unknown',
                            profileName: activeProfile.name,
                            charCount: cellText.length,
                            durationMs: duration
                        });

                        // 存入缓存
                        cache.put(cellText, translatedText);
                        translatedCount++;
                        console.log(`单元格 ${i + 1} 翻译成功`);
                    }

                    // 10. 格式化翻译结果（根据翻译模式）
                    const formattedText = formatTranslation(cellText, translatedText, translationMode);

                    // 11. 使用 WorkspaceEdit 更新单元格内容
                    const edit = new vscode.WorkspaceEdit();
                    const fullRange = new vscode.Range(
                        0, 0,
                        cell.document.lineCount, 0
                    );

                    // 替换整个单元格的内容
                    edit.replace(cell.document.uri, fullRange, formattedText);                    // 应用编辑
                    const success = await vscode.workspace.applyEdit(edit);

                    if (!success) {
                        console.error(`单元格 ${i + 1} 翻译失败：无法应用编辑`);
                    }

                } catch (error) {
                    console.error(`单元格 ${i + 1} 翻译失败:`, error);
                    const errorMessage = error instanceof Error ? error.message : '未知错误';
                    vscode.window.showErrorMessage(`翻译单元格 ${i + 1} 失败: ${errorMessage}`);
                    // 继续处理下一个单元格
                }
            }

            // 12. 显示完成消息
            vscode.window.showInformationMessage(
                `翻译完成！共翻译 ${translatedCount} 个，跳过 ${skippedCount} 个，缓存命中 ${cachedCount} 个`
            );
        }
    );
}

/**
 * 根据配置创建翻译器实例
 * @param engine 翻译引擎类型
 * @param config VSCode 配置对象
 * @returns 翻译器实例
 */
function createTranslator(engine: string, config: vscode.WorkspaceConfiguration): Translator {
    switch (engine) {
        case 'mock':
            // Mock 翻译器，用于调试
            return new MockTranslator();

        case 'openai': {
            // OpenAI 翻译器（支持所有 OpenAI 兼容服务）
            const apiKey = config.get<string>('openai.apiKey', '');
            const model = config.get<string>('openai.model', 'gpt-4o-mini');
            const baseUrl = config.get<string>('openai.baseUrl', 'https://api.openai.com/v1');

            if (!apiKey) {
                throw new Error(
                    '未配置 API Key。请在设置中配置 ipynbTranslator.openai.apiKey，或使用「选择翻译引擎」命令配置'
                );
            }

            return new OpenAITranslator(apiKey, model, baseUrl);
        }

        case 'ollama': {
            // Ollama 本地模型翻译器
            const endpoint = config.get<string>('ollama.endpoint', 'http://localhost:11434');
            const model = config.get<string>('ollama.model', 'llama3');

            return new OllamaTranslator(endpoint, model);
        }

        case 'baidu': {
            // 百度翻译
            const appId = config.get<string>('baidu.appId', '');
            const secretKey = config.get<string>('baidu.secretKey', '');

            if (!appId) {
                throw new Error(
                    '未配置百度翻译 APP ID。请在设置中配置 ipynbTranslator.baidu.appId'
                );
            }
            if (!secretKey) {
                throw new Error(
                    '未配置百度翻译密钥。请在设置中配置 ipynbTranslator.baidu.secretKey'
                );
            }

            return new BaiduTranslator(appId, secretKey);
        }

        default:
            throw new Error(`未知的翻译引擎: ${engine}`);
    }
}

/**
 * 测试翻译引擎连接
 */
async function testTranslatorConnection(): Promise<void> {
    profileManager.refresh();
    const activeProfile = profileManager.getActiveProfile();

    if (!activeProfile) {
        vscode.window.showWarningMessage('尚未配置翻译服务，请先创建配置');
        return;
    }

    const startTime = Date.now();

    // 显示进度
    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: `正在测试 "${activeProfile.name}" 连接...`,
            cancellable: false
        },
        async () => {
            try {
                const translator = await createTranslatorFromProfile(activeProfile);

                // 发送测试请求
                const result = await translator.translate('Hello');
                const elapsed = Date.now() - startTime;

                if (result && result.length > 0) {
                    vscode.window.showInformationMessage(
                        `✅ 连接成功！"${activeProfile.name}" 响应正常 (延迟: ${elapsed}ms)`
                    );
                } else {
                    vscode.window.showWarningMessage(
                        `⚠️ 连接成功但响应为空，请检查配置。`
                    );
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : '未知错误';

                // 检查是否是认证错误
                if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') ||
                    errorMessage.includes('API Key') || errorMessage.includes('apiKey')) {
                    vscode.window.showErrorMessage(
                        `❌ 认证失败: 请检查 API Key 是否正确配置。\n${errorMessage}`
                    );
                } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('连接')) {
                    vscode.window.showErrorMessage(
                        `❌ 连接失败: 无法连接到服务。请检查网络或服务是否启动。\n${errorMessage}`
                    );
                } else {
                    vscode.window.showErrorMessage(
                        `❌ 测试失败: ${errorMessage}`
                    );
                }
            }
        }
    );
}

/**
 * 根据 Profile 创建翻译器实例
 * 自动从 SecretStorage 获取 Key
 */
async function createTranslatorFromProfile(profile: TranslatorProfile): Promise<Translator> {
    // 获取 Key
    const key = await profileManager.getApiKey(profile.name);

    // 如果需要 Key 但没有找到，尝试提示用户输入 (针对刚导入配置的情况)
    // 或者直接抛出错误让用户去配置

    switch (profile.provider) {
        case 'openai': {
            let apiKey = key;
            if (!apiKey) {
                const promptMsg = `请输入配置 "${profile.name}" 的 OpenAI API Key`;
                const input = await vscode.window.showInputBox({
                    prompt: promptMsg,
                    password: true,
                    placeHolder: '输入新的 API Key (留空并回车可删除当前 Key)',
                    ignoreFocusOut: true
                });

                if (input !== undefined) { // 用户按下了回车（包括空字符串）
                    if (input.trim() === '') {
                        // 空字符串：删除 Key
                        const confirm = await vscode.window.showWarningMessage(
                            `确定要清除配置 "${profile.name}" 的密钥吗？`,
                            '确定清除',
                            '取消'
                        );

                        if (confirm === '确定清除') {
                            await profileManager.deleteApiKey(profile.name);
                            vscode.window.showInformationMessage(`✅ 已安全清除配置 "${profile.name}" 的密钥`);
                            // 重新测试连接（预期会失败/提示缺key）
                            vscode.commands.executeCommand('ipynbTranslator.testConnection', true);
                            throw new Error(`配置 "${profile.name}" 缺少 API Key`); // Key cleared, cannot proceed
                        } else {
                            // User cancelled clearing, but no key was provided, so still an error
                            throw new Error(`配置 "${profile.name}" 缺少 API Key`);
                        }
                    } else {
                        // 非空字符串：更新 Key
                        await profileManager.setApiKey(profile.name, input);
                        vscode.window.showInformationMessage(`✅ 配置 "${profile.name}" 的密钥已更新`);
                        // 更新后自动测试
                        vscode.commands.executeCommand('ipynbTranslator.testConnection', true);
                        apiKey = input; // Update local apiKey for current use
                    }
                } else {
                    // User pressed Escape or clicked outside, no input provided
                    throw new Error(`配置 "${profile.name}" 缺少 API Key`);
                }
            }

            return new OpenAITranslator(
                apiKey,
                profile.model || 'gpt-4o-mini',
                profile.baseUrl || 'https://api.openai.com/v1',
                profile.customPrompt
            );
        }

        case 'ollama': {
            return new OllamaTranslator(
                profile.endpoint || 'http://localhost:11434',
                profile.model || 'llama3',
                profile.customPrompt
            );
        }

        case 'baidu': {
            // 百度目前只存储 secretKey，appId 还是明文
            // 注意：之前的实现逻辑中 secretKey 可能存放在 profile.secretKey
            // 这里统一从 secrets 读取
            let secretKey = key;
            if (!secretKey) {
                secretKey = await vscode.window.showInputBox({
                    prompt: `请输入配置 "${profile.name}" 的百度翻译密钥`,
                    password: true
                });
                if (secretKey) {
                    await profileManager.setApiKey(profile.name, secretKey);
                } else {
                    throw new Error(`配置 "${profile.name}" 缺少密钥`);
                }
            }

            if (!profile.appId) {
                throw new Error(`配置 "${profile.name}" 未设置百度翻译 APP ID`);
            }
            return new BaiduTranslator(profile.appId, secretKey);
        }

        default:
            // Should be unreachable if all cases are covered
            const _exhaustiveCheck: never = profile;
            throw new Error(`未知的服务提供商: ${(profile as any).provider}`);
    }
}

/**
 * 选择翻译配置
 */
async function selectProfile(): Promise<void> {
    profileManager.refresh();
    const profiles = profileManager.getProfiles();
    const activeProfile = profileManager.getActiveProfile();

    if (profiles.length === 0) {
        const action = await vscode.window.showWarningMessage(
            '尚未配置翻译服务，是否现在创建？',
            '创建配置'
        );
        if (action === '创建配置') {
            await addNewProfile();
        }
        return;
    }

    // 构建 QuickPick 列表
    const items = profiles.map(p => {
        let description = '';
        if (p.provider === 'openai') {
            description = p.baseUrl;
        } else if (p.provider === 'ollama') {
            description = p.model;
        } else if (p.provider === 'baidu') {
            description = p.appId;
        }

        return {
            label: `$(${getProviderIcon(p.provider)}) ${p.name}`,
            description,
            detail: activeProfile?.name === p.name ? '(当前使用中)' : undefined,
            profile: p
        };
    });

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: '选择要使用的翻译配置',
        title: '选择翻译配置'
    });

    if (selected) {
        await profileManager.setActiveProfile(selected.profile.name);
        vscode.window.showInformationMessage(
            `✅ 已切换到配置: ${selected.profile.name}`
        );
    }
}

/**
 * 获取服务提供商图标
 */
function getProviderIcon(provider: string): string {
    switch (provider) {
        case 'openai': return 'sparkle';
        case 'ollama': return 'server';
        case 'baidu': return 'globe';
        default: return 'gear';
    }
}

/**
 * 新建翻译配置
 */
async function addNewProfile(): Promise<void> {
    // 选择服务提供商
    const providers = [
        { label: '$(sparkle) OpenAI / 兼容服务', detail: 'OpenAI, NVIDIA, DeepSeek, 硅基流动等', value: 'openai' },
        { label: '$(server) Ollama', detail: '本地模型', value: 'ollama' },
        { label: '$(globe) 百度翻译', detail: '百度通用文本翻译 API', value: 'baidu' }
    ];

    const selectedProvider = await vscode.window.showQuickPick(providers, {
        placeHolder: '选择服务提供商',
        title: '新建翻译配置 (1/3)'
    });

    if (!selectedProvider) {
        return;
    }

    // 输入配置名称
    const name = await vscode.window.showInputBox({
        prompt: '输入配置名称（如：OpenAI GPT-4, NVIDIA Llama3）',
        placeHolder: '配置名称',
        validateInput: (value) => {
            if (!value.trim()) {
                return '名称不能为空';
            }
            const profiles = profileManager.getProfiles();
            if (profiles.some(p => p.name === value.trim())) {
                return '该名称已存在';
            }
            return null;
        }
    });

    if (!name) {
        return;
    }

    // 根据提供商类型收集配置
    let profile: TranslatorProfile;

    if (selectedProvider.value === 'openai') {
        const presets = [
            { label: 'OpenAI 官方', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
            { label: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1', model: 'meta/llama-3.1-8b-instruct' },
            { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
            { label: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', model: 'Qwen/Qwen2.5-7B-Instruct' },
            { label: '自定义...', baseUrl: '', model: '' }
        ];

        const preset = await vscode.window.showQuickPick(presets, {
            placeHolder: '选择预设或自定义',
            title: '新建翻译配置 (2/3)'
        });

        if (!preset) {
            return;
        }

        const baseUrl = preset?.label === '自定义...'
            ? (await vscode.window.showInputBox({ prompt: '输入 API 端点', placeHolder: 'https://api.example.com/v1' }) || '')
            : (preset?.baseUrl || 'https://api.openai.com/v1');

        const model = preset?.label === '自定义...'
            ? (await vscode.window.showInputBox({ prompt: '输入模型名称', placeHolder: 'gpt-4o' }) || '')
            : (preset?.model || 'gpt-4o-mini');

        const apiKey = await vscode.window.showInputBox({
            prompt: '输入 API Key',
            password: true,
            placeHolder: 'sk-...',
            ignoreFocusOut: true
        }) || '';

        profile = {
            name: name.trim(),
            provider: 'openai',
            baseUrl,
            model,
            apiKey
        };

    } else if (selectedProvider.value === 'ollama') {
        const endpoint = await vscode.window.showInputBox({
            prompt: 'Ollama 端点',
            value: 'http://localhost:11434'
        }) || 'http://localhost:11434';

        const model = await vscode.window.showInputBox({
            prompt: '模型名称',
            placeHolder: 'llama3'
        }) || 'llama3';

        profile = {
            name: name.trim(),
            provider: 'ollama',
            endpoint,
            model
        };

    } else {
        // baidu
        const appId = await vscode.window.showInputBox({
            prompt: '百度翻译 APP ID',
            placeHolder: '2023...'
        }) || '';

        const secretKey = await vscode.window.showInputBox({
            prompt: '百度翻译密钥',
            password: true
        }) || '';

        profile = {
            name: name.trim(),
            provider: 'baidu',
            appId,
            secretKey
        };
    }

    // 保存配置
    try {
        // 先移除 key 再保存 Profile
        const safeProfile = { ...profile };
        let secretToSave = '';

        if (profile.provider === 'openai') {
            secretToSave = (profile as any).apiKey || '';
            delete (safeProfile as any).apiKey;
        } else if (profile.provider === 'baidu') {
            secretToSave = (profile as any).secretKey || '';
            delete (safeProfile as any).secretKey;
        }

        await profileManager.addProfile(safeProfile);

        // 保存 Key 到 SecretStorage
        if (secretToSave) {
            await profileManager.setApiKey(safeProfile.name, secretToSave);
        }

        await profileManager.setActiveProfile(safeProfile.name);
        vscode.window.showInformationMessage(
            `✅ 配置 "${safeProfile.name}" 已创建并激活 (Keys stored securely)`
        );
    } catch (error) {
        const msg = error instanceof Error ? error.message : '未知错误';
        vscode.window.showErrorMessage(`创建配置失败: ${msg}`);
    }
}
