/**
 * 翻译器接口和实现
 */

/**
 * 翻译模式
 */
export type TranslationMode = 'replace' | 'bilingual';

/**
 * 格式化翻译结果
 * @param originalText 原文
 * @param translatedText 译文
 * @param mode 翻译模式
 * @returns 格式化后的文本
 */
export function formatTranslation(originalText: string, translatedText: string, mode: TranslationMode): string {
    if (mode === 'replace') {
        // 直接替换模式
        return translatedText;
    } else {
        // 双语对照模式：将原文放在 HTML 注释中
        return `<!-- Original English:\n${originalText}\n-->\n\n${translatedText}`;
    }
}

/**
 * 翻译器接口
 * 所有翻译引擎都需要实现此接口
 */
export interface Translator {
    /**
     * 翻译文本
     * @param text 待翻译的文本
     * @returns 翻译后的文本
     */
    translate(text: string): Promise<string>;
}

/**
 * Mock 翻译器（模拟翻译）
 * 用于调试和无网络环境，直接在原文前添加标记
 */
export class MockTranslator implements Translator {
    async translate(text: string): Promise<string> {
        // 模拟翻译延迟
        await new Promise<void>(resolve => {
            const timer = global.setTimeout(() => {
                clearTimeout(timer);
                resolve();
            }, 100);
        });

        // 简单地在原文前添加 [Mock Translation] 标记
        return `[模拟翻译]\n${text}`;
    }
}

/**
 * 简单的 HTTP 请求函数
 * 使用 Node.js 的 https 模块
 */
function httpsRequest(url: string, options: any): Promise<string> {
    return new Promise((resolve, reject) => {
        const https = require('https');
        const urlObj = new URL(url);

        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = https.request(reqOptions, (res: any) => {
            let data = '';

            res.on('data', (chunk: any) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (error: Error) => {
            reject(error);
        });

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

/**
 * OpenAI 翻译器
 * 调用 OpenAI Chat Completion API 进行翻译
 */
export class OpenAITranslator implements Translator {
    private apiKey: string;
    private model: string;
    private baseUrl: string;

    /**
     * 构造函数
     * @param apiKey OpenAI API 密钥
     * @param model 模型名称（例如：gpt-4o-mini, gpt-3.5-turbo）
     * @param baseUrl API 基础 URL（用于兼容接口）
     */
    constructor(apiKey: string, model: string = 'gpt-4o-mini', baseUrl: string = 'https://api.openai.com/v1') {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    }

    async translate(text: string): Promise<string> {
        // 构建请求 URL
        const url = `${this.baseUrl}/chat/completions`;

        // 构建翻译提示词
        const systemPrompt = `You are a professional technical translator specializing in translating Jupyter Notebook documentation from English to Chinese.

Translation Guidelines:
1. Preserve all Markdown syntax (headers, lists, code blocks, links, etc.)
2. Keep all code snippets, variable names, and function names in English
3. Maintain technical terms accuracy (you can add Chinese translation in parentheses for key terms)
4. Keep the same formatting and structure
5. Translate naturally and fluently in Chinese, suitable for technical documentation
6. Keep LaTeX math formulas unchanged`;

        const userPrompt = `Please translate the following Markdown content into Chinese:\n\n${text}`;

        // 构建请求体
        const requestBody = {
            model: this.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.3  // 较低的温度以保持翻译的一致性
        };

        try {
            // 发送 HTTP 请求
            const responseText = await httpsRequest(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            const data = JSON.parse(responseText);

            // 提取翻译结果
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                return data.choices[0].message.content.trim();
            } else {
                throw new Error('Invalid response format from OpenAI API');
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Translation failed: ${error.message}`);
            }
            throw error;
        }
    }
}
