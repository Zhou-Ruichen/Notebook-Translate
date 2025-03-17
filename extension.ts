// extension.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as crypto from 'crypto';

// 翻译引擎接口
interface TranslationService {
    translate(text: string): Promise<string>;
}

// 翻译引擎类型
enum TranslationEngineType {
    Baidu = 'baidu',
    Youdao = 'youdao',
    Google = 'google',
    OpenAI = 'openai',
    Azure = 'azure',
    Mock = 'mock'
}

// 百度翻译服务
class BaiduTranslationService implements TranslationService {
    private appid: string;
    private secret: string;
    
    constructor(appid: string, secret: string) {
        this.appid = appid;
        this.secret = secret;
    }
    
    async translate(text: string): Promise<string> {
        const salt = Date.now();
        const sign = crypto.createHash('md5').update(this.appid + text + salt + this.secret).digest('hex');
        
        try {
            const response = await axios.get('http://api.fanyi.baidu.com/api/trans/vip/translate', {
                params: {
                    q: text,
                    from: 'en',
                    to: 'zh',
                    appid: this.appid,
                    salt: salt,
                    sign: sign
                }
            });
            
            if (response.data && response.data.trans_result) {
                return response.data.trans_result.map((item: any) => item.dst).join('\n');
            }
            
            throw new Error('Translation failed: ' + JSON.stringify(response.data));
        } catch (error) {
            console.error('Translation API error:', error);
            throw error;
        }
    }
}

// 有道翻译服务
class YoudaoTranslationService implements TranslationService {
    private appKey: string;
    private appSecret: string;
    
    constructor(appKey: string, appSecret: string) {
        this.appKey = appKey;
        this.appSecret = appSecret;
    }
    
    async translate(text: string): Promise<string> {
        const salt = new Date().getTime();
        const curtime = Math.round(new Date().getTime() / 1000);
        const str1 = this.appKey + this.truncate(text) + salt + curtime + this.appSecret;
        const sign = crypto.createHash('sha256').update(str1).digest('hex');
        
        try {
            const response = await axios.post('https://openapi.youdao.com/api', {
                q: text,
                appKey: this.appKey,
                salt: salt,
                from: 'en',
                to: 'zh-CHS',
                sign: sign,
                signType: 'v3',
                curtime: curtime
            });
            
            if (response.data && response.data.translation) {
                return response.data.translation.join('\n');
            }
            
            throw new Error('Translation failed: ' + JSON.stringify(response.data));
        } catch (error) {
            console.error('Translation API error:', error);
            throw error;
        }
    }
    
    private truncate(text: string): string {
        const len = text.length;
        if (len <= 20) {
            return text;
        }
        return text.substring(0, 10) + len + text.substring(len - 10, len);
    }
}

// Google翻译服务
class GoogleTranslationService implements TranslationService {
    private apiKey: string;
    
    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }
    
    async translate(text: string): Promise<string> {
        try {
            const response = await axios.post(`https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`, {
                q: text,
                source: 'en',
                target: 'zh-CN',
                format: 'text'
            });
            
            if (response.data && 
                response.data.data && 
                response.data.data.translations && 
                response.data.data.translations.length > 0) {
                return response.data.data.translations.map((t: any) => t.translatedText).join('\n');
            }
            
            throw new Error('Translation failed: ' + JSON.stringify(response.data));
        } catch (error) {
            console.error('Translation API error:', error);
            throw error;
        }
    }
}

// OpenAI (GPT) 翻译服务
class OpenAITranslationService implements TranslationService {
    private apiKey: string;
    private model: string;
    private prompt: string;
    private apiEndpoint: string;
    
    constructor(apiKey: string, model: string, prompt: string, apiEndpoint: string = 'https://api.openai.com/v1/chat/completions') {
        this.apiKey = apiKey;
        this.model = model;
        this.prompt = prompt || '请将以下英文Markdown内容翻译成中文，保持所有的Markdown格式和标签不变：';
        this.apiEndpoint = apiEndpoint;
    }
    
    async translate(text: string): Promise<string> {
        try {
            const response = await axios.post(this.apiEndpoint, {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: this.prompt
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.3
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            
            if (response.data && 
                response.data.choices && 
                response.data.choices.length > 0) {
                return response.data.choices[0].message.content;
            }
            
            throw new Error('Translation failed: ' + JSON.stringify(response.data));
        } catch (error) {
            console.error('OpenAI API error:', error);
            throw error;
        }
    }
}

// Azure OpenAI 翻译服务
class AzureOpenAITranslationService implements TranslationService {
    private apiKey: string;
    private deploymentId: string;
    private prompt: string;
    private apiEndpoint: string;
    
    constructor(apiKey: string, deploymentId: string, prompt: string, apiEndpoint: string) {
        this.apiKey = apiKey;
        this.deploymentId = deploymentId;
        this.prompt = prompt || '请将以下英文Markdown内容翻译成中文，保持所有的Markdown格式和标签不变：';
        this.apiEndpoint = apiEndpoint;
    }
    
    async translate(text: string): Promise<string> {
        try {
            const url = `${this.apiEndpoint}/openai/deployments/${this.deploymentId}/chat/completions?api-version=2023-05-15`;
            const response = await axios.post(url, {
                messages: [
                    {
                        role: 'system',
                        content: this.prompt
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.3
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': this.apiKey
                }
            });
            
            if (response.data && 
                response.data.choices && 
                response.data.choices.length > 0) {
                return response.data.choices[0].message.content;
            }
            
            throw new Error('Translation failed: ' + JSON.stringify(response.data));
        } catch (error) {
            console.error('Azure OpenAI API error:', error);
            throw error;
        }
    }
}

// 模拟翻译服务（用于测试）
class MockTranslationService implements TranslationService {
    async translate(text: string): Promise<string> {
        console.log('模拟翻译文本:', text);
        return `[模拟翻译结果] ${text}`;
    }
}

// 翻译工厂，用于创建不同类型的翻译服务
class TranslationServiceFactory {
    static createService(type: TranslationEngineType, config: any): TranslationService {
        switch (type) {
            case TranslationEngineType.Baidu:
                return new BaiduTranslationService(config.appid, config.secret);
            case TranslationEngineType.Youdao:
                return new YoudaoTranslationService(config.appKey, config.appSecret);
            case TranslationEngineType.Google:
                return new GoogleTranslationService(config.apiKey);
            case TranslationEngineType.OpenAI:
                return new OpenAITranslationService(
                    config.apiKey, 
                    config.model || 'gpt-3.5-turbo', 
                    config.prompt, 
                    config.apiEndpoint
                );
            case TranslationEngineType.Azure:
                return new AzureOpenAITranslationService(
                    config.apiKey,
                    config.deploymentId,
                    config.prompt,
                    config.apiEndpoint
                );
            case TranslationEngineType.Mock:
            default:
                return new MockTranslationService();
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Jupyter Notebook Markdown 英译汉插件已激活');

    // 获取配置并创建服务
    const getTranslationService = (): Promise<TranslationService> => {
        const config = vscode.workspace.getConfiguration('ipynbTranslator');
        const engineType = config.get<string>('engineType', 'mock') as TranslationEngineType;
        
        // 不同类型的翻译引擎需要不同的配置参数
        switch (engineType) {
            case TranslationEngineType.Baidu: {
                const appid = config.get<string>('baidu.appid', '');
                const secret = config.get<string>('baidu.secret', '');
                
                if (!appid || !secret) {
                    return vscode.window.showInputBox({
                        prompt: '请输入百度翻译API的APPID',
                        placeHolder: 'APPID'
                    }).then(appid => {
                        if (!appid) { throw new Error('缺少APPID'); }
                        return vscode.window.showInputBox({
                            prompt: '请输入百度翻译API的密钥',
                            placeHolder: 'Secret',
                            password: true
                        });
                    }).then(secret => {
                        if (!secret) { throw new Error('缺少密钥'); }
                        // 保存配置
                        config.update('baidu.appid', appid, true);
                        config.update('baidu.secret', secret, true);
                        return TranslationServiceFactory.createService(engineType, { appid, secret });
                    });
                }
                
                return Promise.resolve(TranslationServiceFactory.createService(engineType, { appid, secret }));
            }
            
            case TranslationEngineType.Youdao: {
                const appKey = config.get<string>('youdao.appKey', '');
                const appSecret = config.get<string>('youdao.appSecret', '');
                
                if (!appKey || !appSecret) {
                    return vscode.window.showInputBox({
                        prompt: '请输入有道翻译API的应用ID',
                        placeHolder: 'App Key'
                    }).then(appKey => {
                        if (!appKey) { throw new Error('缺少应用ID'); }
                        return vscode.window.showInputBox({
                            prompt: '请输入有道翻译API的应用密钥',
                            placeHolder: 'App Secret',
                            password: true
                        });
                    }).then(appSecret => {
                        if (!appSecret) { throw new Error('缺少应用密钥'); }
                        // 保存配置
                        config.update('youdao.appKey', appKey, true);
                        config.update('youdao.appSecret', appSecret, true);
                        return TranslationServiceFactory.createService(engineType, { appKey, appSecret });
                    });
                }
                
                return Promise.resolve(TranslationServiceFactory.createService(engineType, { appKey, appSecret }));
            }
            
            case TranslationEngineType.Google: {
                const apiKey = config.get<string>('google.apiKey', '');
                
                if (!apiKey) {
                    return vscode.window.showInputBox({
                        prompt: '请输入Google翻译API密钥',
                        placeHolder: 'API Key',
                        password: true
                    }).then(apiKey => {
                        if (!apiKey) { throw new Error('缺少API密钥'); }
                        // 保存配置
                        config.update('google.apiKey', apiKey, true);
                        return TranslationServiceFactory.createService(engineType, { apiKey });
                    });
                }
                
                return Promise.resolve(TranslationServiceFactory.createService(engineType, { apiKey }));
            }
            
            case TranslationEngineType.OpenAI: {
                const apiKey = config.get<string>('openai.apiKey', '');
                const model = config.get<string>('openai.model', 'gpt-3.5-turbo');
                const prompt = config.get<string>('openai.prompt', '请将以下英文Markdown内容翻译成中文，保持所有的Markdown格式和标签不变：');
                const apiEndpoint = config.get<string>('openai.apiEndpoint', 'https://api.openai.com/v1/chat/completions');
                
                if (!apiKey) {
                    return vscode.window.showInputBox({
                        prompt: '请输入OpenAI API密钥',
                        placeHolder: 'API Key',
                        password: true
                    }).then(apiKey => {
                        if (!apiKey) { throw new Error('缺少API密钥'); }
                        return vscode.window.showInputBox({
                            prompt: '请输入OpenAI模型名称',
                            placeHolder: 'Model',
                            value: 'gpt-3.5-turbo'
                        });
                    }).then(model => {
                        if (!model) { model = 'gpt-3.5-turbo'; }
                        return vscode.window.showInputBox({
                            prompt: '请输入翻译提示词',
                            placeHolder: 'Prompt',
                            value: prompt
                        });
                    }).then(userPrompt => {
                        if (!userPrompt) { userPrompt = prompt; }
                        return vscode.window.showInputBox({
                            prompt: '请输入API端点（可选，默认为OpenAI官方端点）',
                            placeHolder: 'API Endpoint',
                            value: apiEndpoint
                        });
                    }).then(endpoint => {
                        if (!endpoint) { endpoint = apiEndpoint; }
                        // 保存配置
                        config.update('openai.apiKey', apiKey, true);
                        config.update('openai.model', model, true);
                        config.update('openai.prompt', userPrompt, true);
                        config.update('openai.apiEndpoint', endpoint, true);
                        return TranslationServiceFactory.createService(
                            engineType, 
                            { apiKey, model, prompt: userPrompt, apiEndpoint: endpoint }
                        );
                    });
                }
                
                return Promise.resolve(TranslationServiceFactory.createService(
                    engineType, 
                    { apiKey, model, prompt, apiEndpoint }
                ));
            }
            
            case TranslationEngineType.Azure: {
                const apiKey = config.get<string>('azure.apiKey', '');
                const deploymentId = config.get<string>('azure.deploymentId', '');
                const prompt = config.get<string>('azure.prompt', '请将以下英文Markdown内容翻译成中文，保持所有的Markdown格式和标签不变：');
                const apiEndpoint = config.get<string>('azure.apiEndpoint', '');
                
                if (!apiKey || !deploymentId || !apiEndpoint) {
                    return vscode.window.showInputBox({
                        prompt: '请输入Azure OpenAI API密钥',
                        placeHolder: 'API Key',
                        password: true
                    }).then(apiKey => {
                        if (!apiKey) { throw new Error('缺少API密钥'); }
                        return vscode.window.showInputBox({
                            prompt: '请输入Azure OpenAI部署ID',
                            placeHolder: 'Deployment ID'
                        });
                    }).then(deploymentId => {
                        if (!deploymentId) { throw new Error('缺少部署ID'); }
                        return vscode.window.showInputBox({
                            prompt: '请输入Azure OpenAI端点URL',
                            placeHolder: 'https://your-resource-name.openai.azure.com'
                        });
                    }).then(endpoint => {
                        if (!endpoint) { throw new Error('缺少API端点'); }
                        return vscode.window.showInputBox({
                            prompt: '请输入翻译提示词',
                            placeHolder: 'Prompt',
                            value: prompt
                        });
                    }).then(userPrompt => {
                        if (!userPrompt) { userPrompt = prompt; }
                        // 保存配置
                        config.update('azure.apiKey', apiKey, true);
                        config.update('azure.deploymentId', deploymentId, true);
                        config.update('azure.apiEndpoint', apiEndpoint, true);
                        config.update('azure.prompt', userPrompt, true);
                        return TranslationServiceFactory.createService(
                            engineType, 
                            { apiKey, deploymentId, prompt: userPrompt, apiEndpoint }
                        );
                    });
                }
                
                return Promise.resolve(TranslationServiceFactory.createService(
                    engineType, 
                    { apiKey, deploymentId, prompt, apiEndpoint }
                ));
            }
            
            case TranslationEngineType.Mock:
            default:
                return Promise.resolve(TranslationServiceFactory.createService(engineType, {}));
        }
    };

    // 翻译命令
    let translateCommand = vscode.commands.registerCommand('ipynb-translator.translateMarkdown', async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showInformationMessage('没有打开的文件');
                return;
            }

            const document = editor.document;
            // 检查文件是否是ipynb格式
            if (path.extname(document.fileName) !== '.ipynb') {
                vscode.window.showInformationMessage('当前文件不是Jupyter Notebook (.ipynb)文件');
                return;
            }

            // 让用户选择翻译引擎
            const engineTypeOptions = [
                { label: '百度翻译', value: TranslationEngineType.Baidu },
                { label: '有道翻译', value: TranslationEngineType.Youdao },
                { label: 'Google翻译', value: TranslationEngineType.Google },
                { label: 'OpenAI (GPT)', value: TranslationEngineType.OpenAI },
                { label: 'Azure OpenAI', value: TranslationEngineType.Azure },
                { label: '模拟翻译（测试用）', value: TranslationEngineType.Mock }
            ];
            
            const engineTypeConfig = vscode.workspace.getConfiguration('ipynbTranslator').get<string>('engineType', 'mock');
            
            const selectedEngine = await vscode.window.showQuickPick(engineTypeOptions, {
                placeHolder: '选择翻译引擎',
                canPickMany: false
            });
            
            if (!selectedEngine) {
                vscode.window.showInformationMessage('已取消翻译');
                return;
            }
            
            // 更新选择的引擎类型
            await vscode.workspace.getConfiguration('ipynbTranslator').update('engineType', selectedEngine.value, true);
            
            vscode.window.showInformationMessage(`正在使用${selectedEngine.label}翻译...`);
            
            // 获取翻译服务
            const translationService = await getTranslationService();
            
            // 读取ipynb文件内容
            const content = document.getText();
            const notebook = JSON.parse(content);
            
            // 检查是否有cells属性
            if (!notebook.cells || !Array.isArray(notebook.cells)) {
                vscode.window.showInformationMessage('无法识别的Notebook格式');
                return;
            }
            
            // 创建进度条
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "翻译Markdown单元格",
                cancellable: true
            }, async (progress, token) => {
                // 标记是否有单元格被翻译
                let hasTranslated = false;
                let totalMarkdownCells = notebook.cells.filter((cell: any) => cell.cell_type === 'markdown').length;
                let processedCells = 0;
                
                // 监听取消操作
                token.onCancellationRequested(() => {
                    console.log("用户取消了翻译操作");
                    return;
                });
                
                // 遍历所有单元格
                for (let i = 0; i < notebook.cells.length; i++) {
                    // 检查是否取消
                    if (token.isCancellationRequested) {
                        break;
                    }
                    
                    const cell = notebook.cells[i];
                    
                    // 检查单元格类型是否为markdown
                    if (cell.cell_type === 'markdown') {
                        // 更新进度
                        processedCells++;
                        progress.report({ 
                            message: `处理第 ${processedCells}/${totalMarkdownCells} 个Markdown单元格`,
                            increment: (1 / totalMarkdownCells) * 100
                        });
                        
                        // 检查单元格是否有source属性，且是数组或字符串
                        if (cell.source) {
                            // 合并source（如果是数组）
                            const markdownContent = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
                            
                            // 检测markdownContent是否包含中文（简单检测）
                            const containsChinese = /[\u4e00-\u9fa5]/.test(markdownContent);
                            
                            // 如果不包含中文，则认为是英文，进行翻译
                            if (!containsChinese) {
                                try {
                                    // 翻译markdown内容
                                    const translatedContent = await translationService.translate(markdownContent);
                                    
                                    // 更新cell的source
                                    if (Array.isArray(cell.source)) {
                                        // 如果原始source是数组，我们需要保留换行符的位置
                                        const original = cell.source.join('');
                                        
                                        // 简单方法：使用原始内容的换行符位置来拆分翻译后的内容
                                        const lines = [];
                                        let lastIdx = 0;
                                        let translatedIdx = 0;
                                        
                                        for (let j = 0; j < cell.source.length; j++) {
                                            const item = cell.source[j];
                                            lastIdx += item.length;
                                            
                                            // 如果这是数组的最后一个元素，或者下一个元素以换行符开始，则截取到这里
                                            if (j === cell.source.length - 1 || 
                                                (j < cell.source.length - 1 && cell.source[j + 1].startsWith('\n'))) {
                                                lines.push(translatedContent.substring(translatedIdx, translatedContent.length));
                                                break;
                                            } else {
                                                const proportion = item.length / original.length;
                                                const approximateLength = Math.floor(translatedContent.length * proportion);
                                                lines.push(translatedContent.substring(translatedIdx, translatedIdx + approximateLength));
                                                translatedIdx += approximateLength;
                                            }
                                        }
                                        
                                        cell.source = lines;
                                    } else {
                                        cell.source = translatedContent;
                                    }
                                    
                                    hasTranslated = true;
                                } catch (error) {
                                    console.error('单元格翻译出错:', error);
                                    vscode.window.showErrorMessage(`单元格 ${i+1} 翻译出错: ${error}`);
                                }
                            }
                        }
                    }
                }
                
                if (!hasTranslated) {
                    vscode.window.showInformationMessage('没有找到需要翻译的Markdown单元格');
                    return;
                }
                
                // 将修改后的notebook写回文件
                const modifiedContent = JSON.stringify(notebook, null, 2);
                
                // 替换编辑器内容
                const fullRange = new vscode.Range(
                    document.positionAt(0),
                    document.positionAt(document.getText().length)
                );
                
                const edit = new vscode.WorkspaceEdit();
                edit.replace(document.uri, fullRange, modifiedContent);
                
                await vscode.workspace.applyEdit(edit);
                
                vscode.window.showInformationMessage('Markdown单元格翻译完成');
            });
        } catch (error) {
            vscode.window.showErrorMessage(`翻译出错: ${error}`);
            console.error('翻译出错:', error);
        }
    });

    // 配置命令
    let configCommand = vscode.commands.registerCommand('ipynb-translator.configureEngine', async () => {
        try {
            // 让用户选择要配置的翻译引擎
            const engineTypeOptions = [
                { label: '百度翻译', value: TranslationEngineType.Baidu },
                { label: '有道翻译', value: TranslationEngineType.Youdao },
                { label: 'Google翻译', value: TranslationEngineType.Google },
                { label: 'OpenAI (GPT)', value: TranslationEngineType.OpenAI },
                { label: 'Azure OpenAI', value: TranslationEngineType.Azure }
            ];
            
            const selectedEngine = await vscode.window.showQuickPick(engineTypeOptions, {
                placeHolder: '选择要配置的翻译引擎',
                canPickMany: false
            });
            
            if (!selectedEngine) {
                return;
            }
            
            const config = vscode.workspace.getConfiguration('ipynbTranslator');
            
            switch (selectedEngine.value) {
                case TranslationEngineType.Baidu: {
                    const appid = await vscode.window.showInputBox({
                        prompt: '请输入百度翻译API的APPID',
                        placeHolder: 'APPID',
                        value: config.get('baidu.appid', '')
                    });
                    
                    if (appid === undefined) { return; }
                    
                    const secret = await vscode.window.showInputBox({
                        prompt: '请输入百度翻译API的密钥',
                        placeHolder: 'Secret',
                        password: true,
                        value: config.get('baidu.secret', '')
                    });
                    
                    if (secret === undefined) { return; }
                    
                    await config.update('baidu.appid', appid, true);
                    await config.update('baidu.secret', secret, true);
                    vscode.window.showInformationMessage('百度翻译配置已更新');
                    break;
                }
                
                case TranslationEngineType.Youdao: {
                    const appKey = await vscode.window.showInputBox({
                        prompt: '请输入有道翻译API的应用ID',
                        placeHolder: 'App Key',
                        value: config.get('youdao.appKey', '')
                    });
                    
                    if (appKey === undefined) { return; }
                    
                    const appSecret = await vscode.window.showInputBox({
                        prompt: '请输入有道翻译API的应用密钥',
                        placeHolder: 'App Secret',
                        password: true,
                        value: config.get('youdao.appSecret', '')
                    });
                    
                    if (appSecret === undefined) { return; }
                    
                    await config.update('youdao.appKey', appKey, true);
                    await config.update('youdao.appSecret', appSecret, true);
                    vscode.window.showInformationMessage('有道翻译配置已更新');
                    break;
                }
                
                case TranslationEngineType.Google: {
                    const apiKey = await vscode.window.showInputBox({
                        prompt: '请输入Google翻译API密钥',
                        placeHolder: 'API Key',
                        password: true,
                        value: config.get('google.apiKey', '')
                    });
                    
                    if (apiKey === undefined) { return; }
                    
                    await config.update('google.apiKey', apiKey, true);
                    vscode.window.showInformationMessage('Google翻译配置已更新');
                    break;
                }
                
                case TranslationEngineType.OpenAI: {
                    const apiKey = await vscode.window.showInputBox({
                        prompt: '请输入OpenAI API密钥',
                        placeHolder: 'API Key',
                        password: true,
                        value: config.get('openai.apiKey', '')
                    });
                    
                    if (apiKey === undefined) { return; }
                    
                    const model = await vscode.window.showInputBox({
                        prompt: '请输入OpenAI模型名称',
                        placeHolder: 'Model',
                        value: config.get('openai.model', 'gpt-3.5-turbo')
                    });
                    
                    if (model === undefined) { return; }
                    
                    const prompt = await vscode.window.showInputBox({
                        prompt: '请输入翻译提示词',
                        placeHolder: 'Prompt',
                        value: config.get('openai.prompt', '请将以下英文Markdown内容翻译成中文，保持所有的Markdown格式和标签不变：')
                    });
                    
                    if (prompt === undefined) { return; }
                    
                    const apiEndpoint = await vscode.window.showInputBox({
                        prompt: '请输入API端点（可选，默认为OpenAI官方端点）',
                        placeHolder: 'API Endpoint',
                        value: config.get('openai.apiEndpoint', 'https://api.openai.com/v1/chat/completions')
                    });
                    
                    if (apiEndpoint === undefined) { return; }
                    
                    await config.update('openai.apiKey', apiKey, true);
                    await config.update('openai.model', model, true);
                    await config.update('openai.prompt', prompt, true);
                    await config.update('openai.apiEndpoint', apiEndpoint, true);
                    vscode.window.showInformationMessage('OpenAI配置已更新');
                    break;
                }
                
                case TranslationEngineType.Azure: {
                    const apiKey = await vscode.window.showInputBox({
                        prompt: '请输入Azure OpenAI API密钥',
                        placeHolder: 'API Key',
                        password: true,
                        value: config.get('azure.apiKey', '')
                    });
                    
                    if (apiKey === undefined) { return; }
                    
                    const deploymentId = await vscode.window.showInputBox({
                        prompt: '请输入Azure OpenAI部署ID',
                        placeHolder: 'Deployment ID',
                        value: config.get('azure.deploymentId', '')
                    });
                    
                    if (deploymentId === undefined) { return; }
                    
                    const apiEndpoint = await vscode.window.showInputBox({
                        prompt: '请输入Azure OpenAI端点URL',
                        placeHolder: 'https://your-resource-name.openai.azure.com',
                        value: config.get('azure.apiEndpoint', '')
                    });
                    
                    if (apiEndpoint === undefined) { return; }
                    
                    const prompt = await vscode.window.showInputBox({
                        prompt: '请输入翻译提示词',
                        placeHolder: 'Prompt',
                        value: config.get('azure.prompt', '请将以下英文Markdown内容翻译成中文，保持所有的Markdown格式和标签不变：')
                    });
                    
                    if (prompt === undefined) { return; }
                    
                    await config.update('azure.apiKey', apiKey, true);
                    await config.update('azure.deploymentId', deploymentId, true);
                    await config.update('azure.apiEndpoint', apiEndpoint, true);
                    await config.update('azure.prompt', prompt, true);
                    vscode.window.showInformationMessage('Azure OpenAI配置已更新');
                    break;
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`配置出错: ${error}`);
            console.error('配置出错:', error);
        }
    });

    context.subscriptions.push(translateCommand, configCommand);
}

export function deactivate() {
    console.log('Jupyter Notebook Markdown 英译汉插件已停用');
}
