/**
 * VSCode 扩展入口文件
 * Jupyter Notebook Markdown 英译汉扩展 V0.1
 */

import * as vscode from 'vscode';
import { hasChinese } from './utils';
import { Translator, MockTranslator, OpenAITranslator, formatTranslation, TranslationMode } from './translator';

/**
 * 扩展激活函数
 * 当扩展被激活时调用（首次执行命令时）
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('扩展 "ipynb-markdown-translator" 已激活');

    // 注册命令：翻译 Notebook Markdown 单元格（英译汉）
    const disposable = vscode.commands.registerCommand(
        'ipynbTranslator.translateMarkdownEnToZh',
        async () => {
            await translateNotebookMarkdown();
        }
    );

    context.subscriptions.push(disposable);
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
 */
async function translateNotebookMarkdown() {
    // 1. 检查当前活动编辑器是否是 Notebook
    const notebookEditor = vscode.window.activeNotebookEditor;

    if (!notebookEditor) {
        vscode.window.showErrorMessage('请先打开一个 Jupyter Notebook (.ipynb) 文件');
        return;
    }

    const notebook = notebookEditor.notebook;

    // 2. 读取配置
    const config = vscode.workspace.getConfiguration('ipynbTranslator');
    const engine = config.get<string>('engine', 'mock');
    const translationMode = config.get<TranslationMode>('translationMode', 'bilingual');

    // 3. 创建翻译器实例
    let translator: Translator;

    try {
        translator = createTranslator(engine, config);
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
                    // 9. 调用翻译器翻译
                    const translatedText = await translator.translate(cellText);

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

                    if (success) {
                        translatedCount++;
                        console.log(`单元格 ${i + 1} 翻译成功`);
                    } else {
                        console.error(`单元格 ${i + 1} 翻译失败：无法应用编辑`);
                    }

                } catch (error) {
                    console.error(`单元格 ${i + 1} 翻译失败:`, error);
                    const errorMessage = error instanceof Error ? error.message : '未知错误';
                    vscode.window.showErrorMessage(`翻译单元格 ${i + 1} 失败: ${errorMessage}`);
                    // 继续处理下一个单元格
                }
            }

            // 11. 显示完成消息
            vscode.window.showInformationMessage(
                `翻译完成！共翻译 ${translatedCount} 个单元格，跳过 ${skippedCount} 个单元格`
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
            // OpenAI 翻译器
            const apiKey = config.get<string>('openai.apiKey', '');
            const model = config.get<string>('openai.model', 'gpt-4o-mini');
            const baseUrl = config.get<string>('openai.baseUrl', 'https://api.openai.com/v1');

            if (!apiKey) {
                throw new Error(
                    '未配置 OpenAI API Key。请在设置中配置 ipynbTranslator.openai.apiKey'
                );
            }

            return new OpenAITranslator(apiKey, model, baseUrl);
        }

        default:
            throw new Error(`未知的翻译引擎: ${engine}`);
    }
}
