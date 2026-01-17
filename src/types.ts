export type TranslationProvider = 'openai' | 'ollama' | 'baidu';

export interface BaseProfile {
    name: string;
    provider: TranslationProvider;
    customPrompt?: string;
}

export interface OpenAIProfile extends BaseProfile {
    provider: 'openai';
    apiKey?: string; // Optional because it might be in SecretStorage
    baseUrl: string;
    model: string;
}

export interface OllamaProfile extends BaseProfile {
    provider: 'ollama';
    endpoint: string;
    model: string;
}

export interface BaiduProfile extends BaseProfile {
    provider: 'baidu';
    appId: string;
    secretKey?: string; // Optional because it might be in SecretStorage
}

export type TranslatorProfile = OpenAIProfile | OllamaProfile | BaiduProfile;
