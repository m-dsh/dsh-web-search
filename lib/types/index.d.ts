/**
 * dsh-web-search — Tavily + Serper 多渠道网页搜索插件。
 *
 * 综合 Provider id "web-search"，内部按配置路由到对应渠道；
 * 两个渠道都未启用时回退官方 DeepSeek 搜索。
 */
import Schema from '@deepseek-ai/schemastery';
import type { Context as CordisContext } from '@deepseek-ai/cordis';
interface DshContext extends CordisContext {
    settings: {
        set: (ns: string, key: string, value: unknown) => void;
        register<T>(ns: unknown, schema: unknown, opts?: unknown): unknown;
    };
    get(key: 'webServer'): DshWebServer | undefined;
    get(key: 'credentials'): DshCredentials | undefined;
    get(key: 'webSearchProviders'): Record<string, WebSearchProvider> | undefined;
    get(key: string): unknown;
}
interface DshCredentials {
    resolve: (ref: string) => Promise<{
        value?: string;
    }>;
}
export declare const Config: Schema<Schemastery.ObjectS<{
    maxResults: Schema<number, number>;
    searchTimeoutMs: Schema<number, number>;
    tavilyEnabled: Schema<boolean, boolean>;
    serperEnabled: Schema<boolean, boolean>;
    tavilyBaseURL: Schema<string, string>;
    serperBaseURL: Schema<string, string>;
    defaultChannel: Schema<string, string>;
}>, Schemastery.ObjectT<{
    maxResults: Schema<number, number>;
    searchTimeoutMs: Schema<number, number>;
    tavilyEnabled: Schema<boolean, boolean>;
    serperEnabled: Schema<boolean, boolean>;
    tavilyBaseURL: Schema<string, string>;
    serperBaseURL: Schema<string, string>;
    defaultChannel: Schema<string, string>;
}>>;
export type ConfigType = ReturnType<typeof Config>;
declare module '@deepseek-ai/cordis' {
    interface Events {
    }
}
interface WebSearchRequest {
    query: string;
    maxResults?: number;
}
interface WebSearchSource {
    title: string;
    url: string;
    content: string;
}
interface WebSearchResult {
    sources: WebSearchSource[];
}
interface WebSearchProvider {
    id: string;
    available(ctx: CordisContext, signal?: AbortSignal): boolean | Promise<boolean>;
    search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult>;
}
interface DshWebServer {
    register(opts: {
        kind: 'exact';
        path: string;
        handler: (req: unknown, res: unknown) => void | Promise<void>;
    }): void;
}
export declare const name = "dsh-web-search";
export declare const inject: string[];
export declare function apply(ctx: DshContext, config: ConfigType): void;
export {};
//# sourceMappingURL=index.d.ts.map