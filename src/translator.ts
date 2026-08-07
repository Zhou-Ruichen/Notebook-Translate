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
     * 翻译文本（请求/响应模式）
     * @param text 待翻译的文本
     * @returns 翻译后的文本
     */
    translate(text: string): Promise<string>;

    /**
     * 流式翻译（可选）。逐 token 回调，返回最终完整译文。
     * 不实现的翻译器（如百度）由调用方回退到 translate()。
     * @param text 待翻译的文本
     * @param onToken 每收到一段译文片段时回调
     * @param signal 可选的中断信号，触发后应尽快中止请求
     */
    translateStream?(text: string, onToken: (chunk: string) => void, signal?: AbortSignal): Promise<string>;
}

/**
 * 中断错误：流式翻译被 AbortSignal 取消时抛出
 */
export class CancelledError extends Error {
    constructor() {
        super('Translation cancelled');
        this.name = 'CancelledError';
    }
}

/**
 * 读取 fetch 流式响应体，按行产出字符串。
 * 处理跨 chunk 的不完整行（缓冲到分隔符）。
 * @param body fetch 响应的 ReadableStream
 * @param onLine 每完整一行回调（不含换行符）
 * @param signal 中断信号
 */
async function readLines(body: ReadableStream<Uint8Array>, onLine: (line: string) => void, signal?: AbortSignal): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
        while (true) {
            if (signal?.aborted) { throw new CancelledError(); }
            const { done, value } = await reader.read();
            if (done) { break; }
            buffer += decoder.decode(value, { stream: true });
            let nl: number;
            // 按换行符切，保留最后一段不完整的在 buffer
            while ((nl = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, nl);
                buffer = buffer.slice(nl + 1);
                onLine(line);
            }
        }
        // flush 残留
        if (buffer.length > 0) { onLine(buffer); }
    } finally {
        reader.releaseLock();
    }
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
 * 默认 System Prompt
 */
const DEFAULT_SYSTEM_PROMPT = `You are a professional technical translator specializing in translating Jupyter Notebook documentation from English to Chinese.

Translation Guidelines:
1. Preserve all Markdown syntax (headers, lists, code blocks, links, etc.)
2. Keep all code snippets, variable names, and function names in English
3. Maintain technical terms accuracy (you can add Chinese translation in parentheses for key terms)
4. Keep the same formatting and structure
5. Translate naturally and fluently in Chinese, suitable for technical documentation
6. Keep LaTeX math formulas unchanged`;

/**
 * OpenAI 翻译器
 * 调用 OpenAI Chat Completion API 进行翻译
 */
export class OpenAITranslator implements Translator {
    private apiKey: string;
    private model: string;
    private baseUrl: string;
    private systemPrompt: string;

    /**
     * 构造函数
     * @param apiKey OpenAI API 密钥
     * @param model 模型名称（例如：gpt-4o-mini, gpt-3.5-turbo）
     * @param baseUrl API 基础 URL（用于兼容接口）
     * @param systemPrompt 自定义 System Prompt
     */
    constructor(apiKey: string, model: string = 'gpt-4o-mini', baseUrl: string = 'https://api.openai.com/v1', systemPrompt?: string) {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        this.systemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;
    }

    async translate(text: string): Promise<string> {
        // 构建请求 URL
        const url = `${this.baseUrl}/chat/completions`;

        // 构建翻译提示词
        const systemPrompt = this.systemPrompt;

        const userPrompt = `Please translate the following Markdown content:\n\n${text}`;

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
            const { text: responseText } = await httpFetch(url, {
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
                const content = data.choices[0].message.content;
                if (!content) {
                    return '';
                }
                const cleaned = cleanThinkTags(content);
                if (!cleaned && content.trim().length > 0) {
                    // 原文不为空，但清洗后为空，说明只有推理内容
                    throw new Error('Translation Empty (Reasoning only)');
                }
                return cleaned;
            } else {
                throw new Error('Invalid response format from OpenAI API');
            }
        } catch (error) {
            console.error('OpenAI translate error:', error);
            if (error instanceof Error) {
                throw new Error(`Translation failed: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * 流式翻译：调用 OpenAI chat/completions（stream:true），响应为 SSE。
     * 每行的 data: {json} 中 choices[0].delta.content 携带片段。
     */
    async translateStream(text: string, onToken: (chunk: string) => void, signal?: AbortSignal): Promise<string> {
        const url = `${this.baseUrl}/chat/completions`;
        const userPrompt = `Please translate the following Markdown content:\n\n${text}`;
        const requestBody = {
            model: this.model,
            messages: [
                { role: "system", content: this.systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.3,
            stream: true
        };

        let resp: Response;
        try {
            resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody),
                signal
            });
        } catch (e: any) {
            if (signal?.aborted) { throw new CancelledError(); }
            throw new Error(`Translation failed: ${e?.message ?? e}`);
        }
        if (!resp.ok || !resp.body) {
            const detail = await resp.text().catch(() => '');
            throw new Error(`Translation failed: HTTP ${resp.status}: ${detail}`);
        }

        let result = '';
        await readLines(resp.body, (line) => {
            // SSE 行形如 "data: {...}"，遇 [DONE] 结束；空行跳过
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) { return; }
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') { return; }
            try {
                const chunk = JSON.parse(payload);
                const token = chunk?.choices?.[0]?.delta?.content;
                if (token) {
                    result += token;
                    onToken(token);
                }
            } catch {
                // 忽略无法解析的分片（如心跳注释行）
            }
        }, signal);

        const cleaned = cleanThinkTags(result);
        if (!cleaned && result.trim().length > 0) {
            throw new Error('Translation Empty (Reasoning only)');
        }
        return cleaned;
    }
}

/**
 * 通用 HTTP 响应（基于全局 fetch）
 */
export interface HttpResponse {
    status: number;
    text: string;
}

/**
 * 基于 Node 18+ 全局 fetch 的请求函数，替代手写的 http/https 模块。
 *
 * 错误契约（下游 extension.ts / OllamaTranslator 依赖字符串匹配，不得破坏）：
 * - HTTP 非 2xx：抛 `HTTP ${status}: ${body}`，保留 '401'/'Unauthorized' 等子串。
 * - 网络失败（fetch 仅在此时抛）：从 error.cause 提取 code/hostname，
 *   抛 `Network error (${code}) connecting to ${host}: ...`，其中 code 形如
 *   'ECONNREFUSED'，确保 Ollama 的 ECONNREFUSED 分支仍命中。
 */
export async function httpFetch(url: string, init: RequestInit): Promise<HttpResponse> {
    let resp: Response;
    try {
        resp = await fetch(url, init);
    } catch (e: any) {
        // 透传我们已构造的 HTTP 错误（不会发生在这里，但保持类型安全）
        if (e instanceof Error && e.message.startsWith('HTTP ')) {
            throw e;
        }
        const code = e?.cause?.code ?? 'UNKNOWN';
        const host = e?.cause?.hostname ?? safeHost(url);
        throw new Error(`Network error (${code}) connecting to ${host}: ${e?.message ?? e}`);
    }

    const text = await resp.text();
    if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${text}`);
    }
    return { status: resp.status, text };
}

function safeHost(url: string): string {
    try { return new URL(url).hostname; } catch { return 'unknown'; }
}

/**
 * Ollama 翻译器
 * 调用本地 Ollama API 进行翻译
 */
export class OllamaTranslator implements Translator {
    private endpoint: string;
    private model: string;
    private systemPrompt: string;

    /**
     * 构造函数
     * @param endpoint Ollama API 端点（例如：http://localhost:11434）
     * @param model 模型名称（例如：llama3, mistral）
     * @param systemPrompt 自定义 System Prompt
     */
    constructor(endpoint: string = 'http://localhost:11434', model: string = 'llama3', systemPrompt?: string) {
        this.endpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
        this.model = model;
        this.systemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;
    }

    async translate(text: string): Promise<string> {
        // 构建请求 URL（使用 Ollama 的 /api/chat 接口）
        const url = `${this.endpoint}/api/chat`;

        // 构建翻译提示词（与 OpenAI 保持一致）
        const systemPrompt = this.systemPrompt;

        const userPrompt = `Please translate the following Markdown content:\n\n${text}`;

        // 构建请求体（Ollama Chat API 格式）
        const requestBody = {
            model: this.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            stream: false,  // 禁用流式响应
            options: {
                temperature: 0.3  // 较低的温度以保持翻译的一致性
            }
        };

        try {
            // 发送 HTTP 请求
            const { text: responseText } = await httpFetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = JSON.parse(responseText);

            // 提取翻译结果（Ollama Chat API 响应格式）
            if (data.message && data.message.content) {
                const content = data.message.content;
                if (!content) {
                    return '';
                }
                const cleaned = cleanThinkTags(content);
                if (!cleaned && content.trim().length > 0) {
                    throw new Error('Translation Empty (Reasoning only)');
                }
                return cleaned;
            } else if (data.error) {
                throw new Error(`Ollama API error: ${data.error}`);
            } else {
                throw new Error('Invalid response format from Ollama API');
            }
        } catch (error) {
            console.error('Ollama translate error:', error);
            if (error instanceof Error) {
                // 提供更友好的错误提示
                if (error.message.includes('ECONNREFUSED')) {
                    throw new Error(
                        `无法连接到 Ollama 服务 (${this.endpoint})。请确保：\n` +
                        `1. Ollama 已安装并正在运行（运行 'ollama serve'）\n` +
                        `2. 端点地址配置正确`
                    );
                }
                if (error.message.includes('model') && error.message.includes('not found')) {
                    throw new Error(
                        `模型 '${this.model}' 未找到。请运行 'ollama pull ${this.model}' 下载模型`
                    );
                }
                throw new Error(`翻译失败: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * 流式翻译：调用 Ollama /api/chat（stream:true），响应为 ndjson，
     * 每行 {message:{content:"..."}, done:false}，done:true 结束。
     */
    async translateStream(text: string, onToken: (chunk: string) => void, signal?: AbortSignal): Promise<string> {
        const url = `${this.endpoint}/api/chat`;
        const userPrompt = `Please translate the following Markdown content:\n\n${text}`;
        const requestBody = {
            model: this.model,
            messages: [
                { role: "system", content: this.systemPrompt },
                { role: "user", content: userPrompt }
            ],
            stream: true,
            options: { temperature: 0.3 }
        };

        let resp: Response;
        try {
            resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal
            });
        } catch (e: any) {
            if (signal?.aborted) { throw new CancelledError(); }
            // 复用 translate() 的友好错误（含 ECONNREFUSED / 连接 子串）
            const code = e?.cause?.code ?? 'UNKNOWN';
            if (code === 'ECONNREFUSED') {
                throw new Error(
                    `Network error (ECONNREFUSED) connecting to ${this.endpoint}`
                );
            }
            throw new Error(`Translation failed: ${e?.message ?? e}`);
        }
        if (!resp.ok || !resp.body) {
            const detail = await resp.text().catch(() => '');
            throw new Error(`HTTP ${resp.status}: ${detail}`);
        }

        let result = '';
        await readLines(resp.body, (line) => {
            const trimmed = line.trim();
            if (!trimmed) { return; }
            try {
                const chunk = JSON.parse(trimmed);
                if (chunk.error) {
                    throw new Error(`Ollama API error: ${chunk.error}`);
                }
                const token = chunk?.message?.content;
                if (token) {
                    result += token;
                    onToken(token);
                }
            } catch (e) {
                // JSON.parse 失败或业务错误：业务错误重新抛出，解析噪声吞掉
                if (e instanceof Error && e.message.includes('Ollama API error')) {
                    throw e;
                }
            }
        }, signal);

        const cleaned = cleanThinkTags(result);
        if (!cleaned && result.trim().length > 0) {
            throw new Error('Translation Empty (Reasoning only)');
        }
        return cleaned;
    }
}

/**
 * 延迟函数
 * @param ms 延迟毫秒数
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
        const timer = global.setTimeout(() => {
            clearTimeout(timer);
            resolve();
        }, ms);
    });
}

/**
 * 百度翻译器
 * 调用百度翻译通用文本 API 进行翻译
 */
export class BaiduTranslator implements Translator {
    private appId: string;
    private secretKey: string;
    private lastRequestTime: number = 0;
    private readonly minInterval: number = 1100; // 1.1秒间隔，确保不超过QPS限制

    /**
     * 构造函数
     * @param appId 百度翻译 APP ID
     * @param secretKey 百度翻译密钥
     */
    constructor(appId: string, secretKey: string) {
        this.appId = appId;
        this.secretKey = secretKey;
    }

    /**
     * 计算 MD5 哈希
     * @param text 输入文本
     * @returns MD5 哈希字符串
     */
    private computeMD5(text: string): string {
        const crypto = require('crypto');
        return crypto.createHash('md5').update(text, 'utf8').digest('hex');
    }

    /**
     * 生成随机数（用于签名）
     * @returns 随机数字符串
     */
    private generateSalt(): string {
        return Math.random().toString().slice(2, 12);
    }

    /**
     * 等待以满足 QPS 限制
     */
    private async waitForRateLimit(): Promise<void> {
        const now = Date.now();
        const elapsed = now - this.lastRequestTime;
        if (elapsed < this.minInterval) {
            await sleep(this.minInterval - elapsed);
        }
        this.lastRequestTime = Date.now();
    }

    async translate(text: string): Promise<string> {
        // 等待以满足 QPS 限制
        await this.waitForRateLimit();

        // 生成签名参数
        const salt = this.generateSalt();
        const signStr = this.appId + text + salt + this.secretKey;
        const sign = this.computeMD5(signStr);

        // 构建请求参数
        const params = new URLSearchParams({
            q: text,
            from: 'en',
            to: 'zh',
            appid: this.appId,
            salt: salt,
            sign: sign
        });

        // 构建请求 URL
        const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?${params.toString()}`;

        try {
            // 发送 HTTP 请求（GET，参数已在 query string，无需 Content-Type）
            const { text: responseText } = await httpFetch(url, { method: 'GET' });

            const data = JSON.parse(responseText);

            // 检查错误
            if (data.error_code) {
                const errorMessages: { [key: string]: string } = {
                    '52001': '请求超时，请重试',
                    '52002': '系统错误，请重试',
                    '52003': '未授权用户，请检查 APP ID 是否正确',
                    '54000': '必填参数为空',
                    '54001': '签名错误，请检查 APP ID 和密钥是否正确',
                    '54003': '访问频率受限，请降低调用频率',
                    '54004': '账户余额不足',
                    '54005': '长query请求频繁，请降低长文本调用频率',
                    '58000': '客户端IP非法',
                    '58001': '译文语言方向不支持',
                    '58002': '服务当前已关闭',
                    '90107': '认证未通过或未生效'
                };
                const errorMsg = errorMessages[data.error_code] || `未知错误 (${data.error_code})`;
                throw new Error(`百度翻译 API 错误: ${errorMsg}`);
            }

            // 提取翻译结果
            if (data.trans_result && data.trans_result.length > 0) {
                // 合并所有翻译结果（百度会按行分割）
                return data.trans_result.map((item: { dst: string }) => item.dst).join('\n');
            } else {
                throw new Error('百度翻译 API 返回格式错误');
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`翻译失败: ${error.message}`);
            }
            throw error;
        }
    }
}

export class TranslationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TranslationError';
    }
}

/**
 * 移除 DeepSeek 等推理模型输出的 <think>...</think> 标签
 * @param text 原始 LLM 响应文本
 * @returns 清洗后的文本 (如果只有 think 内容则可能为空字符串)
 */
function cleanThinkTags(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}
