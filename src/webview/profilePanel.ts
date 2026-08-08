/**
 * Profile 管理 Webview 面板
 *
 * 安全约束：webview 永不接触原始 API Key。
 * - getProfiles 只返回 hasKey: boolean，不回传密钥。
 * - 新 key 经 postMessage(saveKey) 送到 host，由 SecretStorage 存储。
 * - 旧 key 不可回显，只能覆盖。
 */
import * as vscode from 'vscode';
import { ProfileManager } from '../profileManager';
import { TranslatorProfile } from '../types';

/** webview 可见的 profile 摘要（不含密钥） */
interface ProfileSummary {
    name: string;
    provider: string;
    model?: string;
    baseUrl?: string;
    endpoint?: string;
    appId?: string;
    customPrompt?: string;
    hasKey: boolean;
    active: boolean;
}

/** webview → host 的消息类型 */
type IncomingMessage =
    | { type: 'getProfiles' }
    | { type: 'saveProfile'; profile: TranslatorProfile }
    | { type: 'saveKey'; name: string; key: string }
    | { type: 'deleteProfile'; name: string }
    | { type: 'activateProfile'; name: string }
    | { type: 'testConnection'; name: string };

export class ProfilePanelProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ipynbTranslator.profilesView';

    constructor(
        private readonly extensionUri: vscode.Uri,
        private readonly profileManager: ProfileManager
    ) {}

    private view?: vscode.WebviewView;

    resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
        };
        webviewView.webview.html = this.getHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            (msg: IncomingMessage) => this.handleMessage(msg),
            undefined
        );

        // 视图可见时刷新一次（拿到最新 active 状态）
        webviewView.onDidDispose(() => { this.view = undefined; });
    }

    /** 外部（状态栏点击、命令）请求显示并聚焦面板 */
    async show(): Promise<void> {
        const profiles = await this.summarize();
        this.view?.webview.postMessage({ type: 'profiles', profiles });
    }

    private async handleMessage(msg: IncomingMessage): Promise<void> {
        switch (msg.type) {
            case 'getProfiles':
                await this.pushProfiles();
                break;
            case 'saveProfile':
                await this.handleSaveProfile(msg.profile);
                break;
            case 'saveKey':
                await this.profileManager.setApiKey(msg.name, msg.key);
                await this.pushProfiles();
                break;
            case 'deleteProfile':
                await this.handleDelete(msg.name);
                break;
            case 'activateProfile':
                await this.handleActivate(msg.name);
                break;
            case 'testConnection':
                await this.handleTest(msg.name);
                break;
        }
    }

    private async handleSaveProfile(profile: TranslatorProfile): Promise<void> {
        try {
            if (!profile.name || !profile.name.trim()) {
                throw new Error('Profile name cannot be empty');
            }
            const exists = this.profileManager.getProfiles().some(p => p.name === profile.name);
            // 分离密钥：apiKey/secretKey 不入 settings.json
            const secret = (profile as any).apiKey || (profile as any).secretKey;
            const configProfile = { ...profile };
            if (configProfile.provider === 'openai') delete (configProfile as any).apiKey;
            if (configProfile.provider === 'baidu') delete (configProfile as any).secretKey;

            if (exists) {
                await this.profileManager.updateProfile(profile.name, configProfile);
            } else {
                await this.profileManager.addProfile(configProfile);
            }
            if (secret) {
                await this.profileManager.setApiKey(profile.name, secret);
            }
            await this.pushProfiles();
            this.view?.webview.postMessage({ type: 'saved', ok: true });
        } catch (e) {
            this.view?.webview.postMessage({ type: 'saved', ok: false, error: String(e) });
        }
    }

    private async handleDelete(name: string): Promise<void> {
        try {
            await this.profileManager.deleteProfile(name); // 原子清除配置 + 密钥
            await this.pushProfiles();
            this.view?.webview.postMessage({ type: 'deleted', ok: true });
        } catch (e) {
            this.view?.webview.postMessage({ type: 'deleted', ok: false, error: String(e) });
        }
    }

    private async handleActivate(name: string): Promise<void> {
        const originalActive = this.profileManager.getActiveProfileName();
        await this.profileManager.setActiveProfile(name);
        // 复用已注册的 testConnection 命令做静默连通性测试
        const success = await vscode.commands.executeCommand<boolean>(
            'ipynbTranslator.testConnection', true
        );
        if (success === false) {
            // 失败自动回滚到上一个可用配置
            const rolledBackTo = await this.profileManager.rollbackToPrevious();
            if (!rolledBackTo) {
                // 无历史可回滚：恢复到激活前的 active，避免坏 profile 留作当前
                await this.profileManager.setActiveProfile(originalActive);
            }
            this.view?.webview.postMessage({
                type: 'activated',
                ok: false,
                error: rolledBackTo
                    ? `连接失败，已回滚到 "${rolledBackTo}"`
                    : `连接失败，已恢复到 "${originalActive || '无配置'}"`,
            });
        } else {
            this.view?.webview.postMessage({ type: 'activated', ok: true });
        }
        await this.pushProfiles();
    }

    private async handleTest(name: string): Promise<void> {
        // Test 不应改变 activeProfile：临时切到目标测连，然后恢复原 active。
        const originalActive = this.profileManager.getActiveProfileName();
        await this.profileManager.setActiveProfile(name);
        const start = Date.now();
        const success = await vscode.commands.executeCommand<boolean>(
            'ipynbTranslator.testConnection', true
        );
        // 无论成败都恢复原 active（与 handleActivate 不同，测试是只读操作）
        if (originalActive && originalActive !== name) {
            await this.profileManager.setActiveProfile(originalActive);
        }
        this.view?.webview.postMessage({
            type: 'testResult',
            ok: success === true,
            latencyMs: Date.now() - start,
        });
        await this.pushProfiles();
    }

    private async pushProfiles(): Promise<void> {
        const summaries = await this.summarize();
        this.view?.webview.postMessage({ type: 'profiles', profiles: summaries });
    }

    /** 构造不含密钥的 profile 摘要列表，hasKey 异步查 SecretStorage */
    private async summarize(): Promise<ProfileSummary[]> {
        const activeName = this.profileManager.getActiveProfileName();
        const first = this.profileManager.getActiveProfile()?.name;
        const profiles = this.profileManager.getProfiles();
        return Promise.all(profiles.map(async p => {
            // 仅对需要密钥的 provider 查存在性；ollama 不需要密钥
            const needsKey = p.provider === 'openai' || p.provider === 'baidu';
            const key = needsKey ? await this.profileManager.getApiKey(p.name) : undefined;
            return {
                name: p.name,
                provider: p.provider,
                model: (p as any).model,
                baseUrl: (p as any).baseUrl,
                endpoint: (p as any).endpoint,
                appId: (p as any).appId,
                customPrompt: (p as any).customPrompt,
                hasKey: !!key,
                // 活跃判定：精确匹配 activeProfile；未设置时第一个为活跃
                active: activeName ? p.name === activeName : p.name === first,
            } as ProfileSummary;
        }));
    }

    private getHtml(webview: vscode.Webview): string {
        const jsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'webview', 'profilePanel.js')
        );
        const cssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'media', 'webview', 'profilePanel.css')
        );
        const nonce = getNonce();

        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${cssUri}" />
    <title>Profiles</title>
</head>
<body>
    <div id="app"></div>
    <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
    }
}

function getNonce(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('base64');
}
