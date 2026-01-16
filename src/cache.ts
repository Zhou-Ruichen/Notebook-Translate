/**
 * 翻译缓存模块
 * 使用 MD5 哈希和 workspaceState 实现智能缓存
 */

import * as vscode from 'vscode';
import * as crypto from 'crypto';

// 缓存存储的 Key
const CACHE_KEY = 'translation_cache_v1';

// 缓存数据结构
interface CacheData {
    [hash: string]: string;
}

/**
 * 翻译缓存类
 * 避免重复翻译相同内容，节省 API Token 和算力
 */
export class TranslationCache {
    private context: vscode.ExtensionContext;
    private cache: CacheData;

    /**
     * 构造函数
     * @param context VSCode 扩展上下文
     */
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        // 从 workspaceState 加载现有缓存
        this.cache = this.context.workspaceState.get<CacheData>(CACHE_KEY, {});
    }

    /**
     * 计算文本的 MD5 哈希值
     * @param text 原文
     * @returns MD5 哈希字符串
     */
    private computeHash(text: string): string {
        return crypto.createHash('md5').update(text, 'utf8').digest('hex');
    }

    /**
     * 从缓存获取翻译结果
     * @param text 原文
     * @returns 译文（如果缓存命中）或 undefined（未命中）
     */
    get(text: string): string | undefined {
        const hash = this.computeHash(text);
        return this.cache[hash];
    }

    /**
     * 将翻译结果存入缓存
     * @param text 原文
     * @param translation 译文
     */
    put(text: string, translation: string): void {
        const hash = this.computeHash(text);
        this.cache[hash] = translation;
        // 持久化到 workspaceState
        this.context.workspaceState.update(CACHE_KEY, this.cache);
    }

    /**
     * 清空缓存
     */
    clear(): void {
        this.cache = {};
        this.context.workspaceState.update(CACHE_KEY, this.cache);
    }

    /**
     * 获取缓存条目数量
     */
    get size(): number {
        return Object.keys(this.cache).length;
    }
}
