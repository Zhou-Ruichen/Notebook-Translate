import * as vscode from 'vscode';
import { TranslatorProfile } from './types';

/**
 * 迁移旧配置到新的 Profile 系统
 * 在扩展启动时调用
 */
export async function migrateSettings() {
    const config = vscode.workspace.getConfiguration('ipynbTranslator');

    // 1. 检查是否存在 Profiles
    const profiles = config.get<TranslatorProfile[]>('profiles', []);
    if (profiles.length > 0) {
        // 如果已经有 Profile，说明已经迁移过或用户已经配置过，无需处理
        return;
    }

    // 2. 检查旧配置是否存在
    const oldApiKey = config.get<string>('openai.apiKey');

    // 如果没有旧的 API Key，说明是全新安装，什么都不做
    // (后续 package.json 的默认配置会提供默认 Profile)
    if (!oldApiKey) {
        return;
    }

    // 3. 读取其他旧配置
    const oldBaseUrl = config.get<string>('openai.baseUrl');
    const oldModel = config.get<string>('openai.model');

    // 4. 创建迁移后的 Profile
    const migratedProfile: TranslatorProfile = {
        name: 'Migrated OpenAI',
        provider: 'openai',
        apiKey: oldApiKey,
        baseUrl: oldBaseUrl || 'https://api.openai.com/v1',
        model: oldModel || 'gpt-4o-mini'
    };

    try {
        // 5. 保存新 Profile
        const newProfiles = [migratedProfile];
        await config.update('profiles', newProfiles, vscode.ConfigurationTarget.Global);

        // 6. 设置激活的 Profile
        await config.update('activeProfile', migratedProfile.name, vscode.ConfigurationTarget.Global);

        // 7. 清理旧配置 (标记为 undefined 删除)
        // 注意：使用 Global 目标以确保从用户设置中移除
        await config.update('openai.apiKey', undefined, vscode.ConfigurationTarget.Global);
        await config.update('openai.baseUrl', undefined, vscode.ConfigurationTarget.Global);
        await config.update('openai.model', undefined, vscode.ConfigurationTarget.Global);

        // 同时也尝试清理 engine 字段
        await config.update('engine', undefined, vscode.ConfigurationTarget.Global);

        vscode.window.showInformationMessage(
            '已自动将您的旧版配置迁移到新的 "Migrated OpenAI" 配置中，旧配置项已清理。'
        );

        console.log('配置自动迁移成功');

    } catch (error) {
        console.error('配置迁移失败:', error);
        vscode.window.showErrorMessage('配置迁移失败，请检查设置');
    }
}
