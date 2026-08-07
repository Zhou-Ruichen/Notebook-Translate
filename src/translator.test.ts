import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { httpFetch, cleanThinkTags, formatTranslation } from './translator';
import { hasChinese } from './utils';

/**
 * 锁定 httpFetch 的错误契约：下游 extension.ts 用 errorMessage.includes(...)
 * 字符串匹配分类错误，这些子串不得破坏。
 */
describe('httpFetch error contract (must preserve downstream includes())', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch as any;
    });

    it('non-2xx throws "HTTP <status>: <body>" containing the status code', async () => {
        globalThis.fetch = vi.fn(async () =>
            new Response('{"error":{"message":"Invalid API key"}}', { status: 401 })
        ) as any;

        await expect(httpFetch('https://x.test/api', { method: 'POST' })).rejects.toThrow();
        try {
            await httpFetch('https://x.test/api', { method: 'POST' });
        } catch (e: any) {
            // 下游 extension.ts 依赖 includes('401')
            expect(e.message).toContain('HTTP 401');
            expect(e.message).toContain('401');
        }
    });

    it('network failure throws a message containing the cause code (ECONNREFUSED)', async () => {
        globalThis.fetch = vi.fn(async () => {
            throw Object.assign(new TypeError('fetch failed'), {
                cause: { code: 'ECONNREFUSED', hostname: 'localhost' },
            });
        }) as any;

        try {
            await httpFetch('http://localhost:11434/api/chat', { method: 'POST' });
            throw new Error('should have thrown');
        } catch (e: any) {
            // 下游 OllamaTranslator 依赖 includes('ECONNREFUSED')
            expect(e.message).toContain('ECONNREFUSED');
            expect(e.message).toContain('localhost');
        }
    });

    it('successful response returns { status, text }', async () => {
        globalThis.fetch = vi.fn(async () =>
            new Response('{"ok":true}', { status: 200 })
        ) as any;

        const res = await httpFetch('https://x.test/api', { method: 'GET' });
        expect(res.status).toBe(200);
        expect(res.text).toBe('{"ok":true}');
    });

    it('500-level error body is included in the message', async () => {
        globalThis.fetch = vi.fn(async () =>
            new Response('server down', { status: 503 })
        ) as any;

        await expect(httpFetch('https://x.test', {})).rejects.toThrow('HTTP 503');
    });
});

describe('cleanThinkTags', () => {
    it('strips <think> blocks from reasoning models', () => {
        const input = '<think>let me reason</think>actual answer';
        expect(cleanThinkTags(input)).toBe('actual answer');
    });

    it('handles multi-line and case-insensitive tags', () => {
        const input = '<THINK>\nline1\nline2\n</THINK>\nresult';
        expect(cleanThinkTags(input)).toBe('result');
    });

    it('returns empty string when only reasoning is present', () => {
        expect(cleanThinkTags('<think>only thoughts</think>')).toBe('');
    });

    it('preserves text when no think tags present', () => {
        expect(cleanThinkTags('plain text')).toBe('plain text');
    });
});

describe('formatTranslation', () => {
    it('replace mode returns translation verbatim', () => {
        expect(formatTranslation('hello', '你好', 'replace')).toBe('你好');
    });

    it('bilingual mode wraps original in an HTML comment', () => {
        const out = formatTranslation('hello', '你好', 'bilingual');
        expect(out).toContain('<!-- Original English:');
        expect(out).toContain('hello');
        expect(out).toContain('你好');
    });
});

describe('hasChinese', () => {
    it('detects CJK characters', () => {
        expect(hasChinese('hello 你好')).toBe(true);
        expect(hasChinese('你好')).toBe(true);
    });

    it('returns false for pure ASCII', () => {
        expect(hasChinese('pure english text')).toBe(false);
        expect(hasChinese('')).toBe(false);
    });
});
