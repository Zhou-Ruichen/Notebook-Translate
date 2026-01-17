import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 翻译统计数据接口
 */
export interface StatsData {
    timestamp: string;
    model: string;
    profileName: string;
    charCount: number;
    durationMs: number;
}

/**
 * 统计服务类
 * 负责记录翻译统计信息到 .vscode/translator-stats.jsonl
 */
export class TranslationStats {
    private enabled: boolean;
    private logFilePath: string | undefined;

    constructor() {
        const config = vscode.workspace.getConfiguration('ipynbTranslator');
        this.enabled = config.get<boolean>('enableStatsLogging', false);
        this.initLogFile();
    }

    /**
     * 初始化日志文件路径
     */
    private initLogFile() {
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return;
        }

        const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const vscodeDir = path.join(rootPath, '.vscode');

        // 确保 .vscode 目录存在
        if (this.enabled && !fs.existsSync(vscodeDir)) {
            try {
                fs.mkdirSync(vscodeDir);
            } catch (error) {
                console.error('Failed to create .vscode directory for stats logging:', error);
            }
        }

        this.logFilePath = path.join(vscodeDir, 'translator-stats.jsonl');
    }

    /**
     * 记录统计信息
     */
    async log(data: Omit<StatsData, 'timestamp'>): Promise<void> {
        // 刷新配置（以防用户在运行时更改）
        const config = vscode.workspace.getConfiguration('ipynbTranslator');
        this.enabled = config.get<boolean>('enableStatsLogging', false);

        // 如果未启用或没有工作区，直接返回
        if (!this.enabled || !this.logFilePath) {
            return;
        }

        const fullData: StatsData = {
            timestamp: new Date().toISOString(),
            ...data
        };

        try {
            const line = JSON.stringify(fullData) + '\n';
            await fs.promises.appendFile(this.logFilePath, line, 'utf8');
        } catch (error) {
            console.error('Failed to write translation stats:', error);
        }

        // 状态栏反馈
        const statusBarMsg = vscode.window.setStatusBarMessage(
            `$(graph) Translated ${data.charCount} chars (${data.durationMs}ms)`
        );

        // 5秒后清除状态栏消息
        setTimeout(() => {
            statusBarMsg.dispose();
        }, 5000);
    }
}
