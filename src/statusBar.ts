import * as vscode from 'vscode';

/**
 * 翻译器状态栏管理类
 * 负责在 VSCode 状态栏显示当前配置和连接状态
 */
export class TranslatorStatusBar {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        // 创建状态栏项目，优先级设为 100（靠左显示）
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'ipynbTranslator.selectProfile'; // 点击触发选择配置
        this.statusBarItem.show();
    }

    /**
     * 更新状态栏显示
     * @param profileName 当前配置名称
     * @param status 连接状态: 'ready' | 'testing' | 'success' | 'error'
     * @param message 额外信息（如延迟或错误详情）
     */
    update(profileName: string, status: 'ready' | 'testing' | 'success' | 'error', message?: string) {
        let icon = '$(globe)';
        let text = profileName;
        let tooltip = `Current Profile: ${profileName}\nClick to switch profile`;

        switch (status) {
            case 'ready':
                icon = '$(globe)';
                break;
            case 'testing':
                icon = '$(sync~spin)';
                text = `${profileName} (Testing...)`;
                tooltip = `Testing connection to ${profileName}...`;
                break;
            case 'success':
                icon = '$(check)';
                if (message) {
                    tooltip += `\nConnection Status: Online (${message})`;
                }
                break;
            case 'error':
                icon = '$(alert)';
                if (message) {
                    tooltip += `\nConnection Error: ${message}`;
                }
                // 出错时背景变红（警告色）
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
        }

        // 成功或重置时清除背景色
        if (status !== 'error') {
            this.statusBarItem.backgroundColor = undefined;
        }

        this.statusBarItem.text = `${icon} ${text}`;
        this.statusBarItem.tooltip = tooltip;
    }

    /**
     * 显示状态栏
     */
    show() {
        this.statusBarItem.show();
    }

    /**
     * 隐藏状态栏
     */
    hide() {
        this.statusBarItem.hide();
    }

    /**
     * 销毁资源
     */
    dispose() {
        this.statusBarItem.dispose();
    }
}
