/**
 * VSCode 扩展入口文件
 * Jupyter Notebook Markdown 英译汉扩展
 */

import * as vscode from 'vscode';
import { hasChinese } from './utils';
import { Translator, OpenAITranslator, OllamaTranslator, BaiduTranslator, formatTranslation, TranslationMode, CancelledError } from './translator';
import { TranslationCache } from './cache';
import { ProfileManager } from './profileManager';
import { TranslatorProfile, TranslationProvider } from './types';
import { migrateSettings } from './migration';
import { TranslationStats } from './statistics';
import { TranslatorStatusBar } from './statusBar';
import { manageProfiles } from './commands/manageProfiles';

// 全局实例
let profileManager: ProfileManager;
let stats: TranslationStats;
let statusBar: TranslatorStatusBar;

/**
 * 缺少 API Key 的错误类
 * 用于标识需要用户配置 Key 的情况，调用方可以据此提供 "Manage Profiles" 按钮
 */
class MissingApiKeyError extends Error {
    constructor(public profileName: string, public provider: string) {
        super(`配置 "${profileName}" 缺少 API Key`);
        this.name = 'MissingApiKeyError';
    }
}

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

    // 启动时验证 activeProfile 是否有效
    await validateActiveProfile();

    // 更新初始状态
    statusBar.update(profileManager.getActiveProfileName() || 'No Profile', 'ready');

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
        async (silent: boolean = false) => {
            return await testTranslatorConnection(silent);
        }
    );

    // 注册命令：管理翻译配置 (统一入口)
    const manageProfilesCmd = vscode.commands.registerCommand(
        'ipynbTranslator.manageProfiles',
        async () => {
            await manageProfiles(profileManager);
        }
    );

    // 注册命令：选择配置 (供状态栏点击使用，重定向到 manageProfiles)
    const selectProfileCmd = vscode.commands.registerCommand(
        'ipynbTranslator.selectProfile',
        async () => {
            await manageProfiles(profileManager);
        }
    );

    context.subscriptions.push(translateCmd, testConnectionCmd, manageProfilesCmd, selectProfileCmd, statusBar);
}

/**
 * 启动时验证 activeProfile 是否有效
 * 如果 activeProfile 指向不存在的配置，自动重置为第一个有效配置
 */
async function validateActiveProfile(): Promise<void> {
    profileManager.refresh();
    const activeName = profileManager.getActiveProfileName();
    const profiles = profileManager.getProfiles();

    if (activeName) {
        const exists = profiles.some(p => p.name === activeName);
        if (!exists) {
            console.warn(`Active profile "${activeName}" not found in profiles list. Resetting to default.`);
            if (profiles.length > 0) {
                await profileManager.setActiveProfile(profiles[0].name);
                vscode.window.showWarningMessage(
                    `配置 "${activeName}" 不存在，已自动切换到 "${profiles[0].name}"。`
                );
            } else {
                // No profiles at all, clear activeProfile
                await profileManager.setActiveProfile('');
            }
        }
    }
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
            await vscode.commands.executeCommand('ipynbTranslator.manageProfiles');
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

    // 4. 获取所有 Markdown 单元格（用 cellCount/cellAt 替代已废弃的 getCells()）
    const markdownCells: vscode.NotebookCell[] = [];
    for (let i = 0; i < notebook.cellCount; i++) {
        const cell = notebook.cellAt(i);
        if (cell.kind === vscode.NotebookCellKind.Markup) {
            markdownCells.push(cell);
        }
    }

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

            // 把 VSCode 取消令牌桥接到 fetch 的 AbortSignal
            const abortController = new AbortController();
            token.onCancellationRequested(() => abortController.abort());

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
                        // 缓存未命中，翻译。优先用流式（可中断、可感知进度），
                        // 不支持流式的翻译器（百度）回退到请求/响应。
                        const startTime = Date.now();
                        if (translator.translateStream) {
                            translatedText = await translator.translateStream(
                                cellText,
                                // 流式回调：只更新进度文案，不写单元格（避免逐 token 闪烁）
                                (chunk) => {
                                    progress.report({
                                        message: `翻译中... (${i + 1}/${totalCells}) ${chunk.length} 字符`
                                    });
                                },
                                abortController.signal
                            );
                        } else {
                            translatedText = await translator.translate(cellText);
                        }
                        const duration = Date.now() - startTime;

                        // 记录统计
                        stats.log({
                            model: (activeProfile as any).model || 'unknown',
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

                    // 11. 用 NotebookEdit.replaceCells 写回整个单元格（替代已废弃的
                    // cell.document 文档级编辑）。一次原子替换，撤销时单步回退。
                    const newCell = new vscode.NotebookCellData(
                        vscode.NotebookCellKind.Markup,
                        formattedText,
                        'markdown'
                    );
                    const edit = new vscode.WorkspaceEdit();
                    edit.set(notebook.uri, [
                        vscode.NotebookEdit.replaceCells(
                            new vscode.NotebookRange(cell.index, cell.index + 1),
                            [newCell]
                        )
                    ]);
                    const success = await vscode.workspace.applyEdit(edit);

                    if (!success) {
                        console.error(`单元格 ${i + 1} 翻译失败：无法应用编辑`);
                    }

                } catch (error) {
                    if (error instanceof CancelledError || token.isCancellationRequested) {
                        vscode.window.showWarningMessage('翻译已取消');
                        return;
                    }
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
 * 测试翻译引擎连接
 */
/**
 * 测试翻译引擎连接
 * @param silent 是否静默测试（不显示 Success 弹窗，只更新状态栏）
 * @returns 测试是否成功
 */
async function testTranslatorConnection(silent: boolean = false): Promise<boolean> {
    profileManager.refresh();
    const activeProfile = profileManager.getActiveProfile();

    if (!activeProfile) {
        if (!silent) vscode.window.showWarningMessage('尚未配置翻译服务，请先创建配置');
        statusBar.update('No Profile', 'error');
        return false;
    }

    statusBar.update(activeProfile.name, 'testing');

    const startTime = Date.now();

    // 显示进度 (仅在非 Silent 模式下，或者是 Silent 但耗时较久?)
    // 简化逻辑：Silent 模式下不使用 withProgress
    if (!silent) {
        return await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `正在测试 "${activeProfile.name}" 连接...`,
                cancellable: false
            },
            async () => {
                return await _performTest(activeProfile, startTime, silent);
            }
        );
    } else {
        return await _performTest(activeProfile, startTime, silent);
    }
}

async function _performTest(activeProfile: TranslatorProfile, startTime: number, silent: boolean): Promise<boolean> {
    try {
        const translator = await createTranslatorFromProfile(activeProfile);

        // 发送测试请求
        const result = await translator.translate('Hello');
        const elapsed = Date.now() - startTime;

        if (result && result.length > 0) {
            if (!silent) {
                vscode.window.showInformationMessage(
                    `✅ 连接成功！"${activeProfile.name}" 响应正常 (延迟: ${elapsed}ms)`
                );
            }
            statusBar.update(activeProfile.name, 'success');
            return true;
        } else {
            if (!silent) {
                vscode.window.showWarningMessage(
                    `⚠️ 连接成功但响应为空，请检查配置。`
                );
            }
            statusBar.update(activeProfile.name, 'error');
            return false;
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';

        statusBar.update(activeProfile.name, 'error');

        // 检查是否是缺少 API Key 的错误
        if (error instanceof MissingApiKeyError) {
            if (!silent) {
                const action = await vscode.window.showErrorMessage(
                    `❌ 配置 "${error.profileName}" 缺少 API Key，无法连接。`,
                    'Manage Profiles'
                );
                if (action === 'Manage Profiles') {
                    vscode.commands.executeCommand('ipynbTranslator.manageProfiles');
                }
            }
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') ||
            errorMessage.includes('API Key') || errorMessage.includes('apiKey')) {
            // 检查是否是认证错误
            if (!silent) vscode.window.showErrorMessage(
                `❌ 认证失败: 请检查 API Key 是否正确配置。\n${errorMessage}`
            );
        } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('连接')) {
            if (!silent) vscode.window.showErrorMessage(
                `❌ 连接失败: 无法连接到服务。请检查网络或服务是否启动。\n${errorMessage}`
            );
        } else {
            if (!silent) vscode.window.showErrorMessage(
                `❌ 测试失败: ${errorMessage}`
            );
        }
        return false;
    }
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
            const apiKey = key;
            if (!apiKey) {
                // 不再强制弹窗，避免死循环。直接抛出错误让调用方处理
                throw new MissingApiKeyError(profile.name, 'openai');
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
            const secretKey = key;
            if (!secretKey) {
                // 不再强制弹窗，避免死循环
                throw new MissingApiKeyError(profile.name, 'baidu');
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
