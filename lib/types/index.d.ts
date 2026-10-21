/**
 * dsh-web-search — Tavily + Serper 多渠道网页搜索插件。
 *
 * 综合 Provider id "web-search"，内部按配置路由到对应渠道；
 * 两个渠道都未启用时回退官方 DeepSeek 搜索。
 */
import Schema from '@deepseek-ai/schemastery';
interface DshContext {
    settings: {
        update(ns: string, patch: Record<string, unknown>): Promise<void>;
    };
    get(key: 'web'): DshWeb | undefined;
    get(key: 'webServer'): DshWebServer | undefined;
    get(key: 'credentials'): DshCredentials | undefined;
    get(key: 'webSearchProviders'): Record<string, WebSearchProvider> | undefined;
    get(key: string): unknown;
    on(event: string, handler: (...args: unknown[]) => void): void;
}
/**
 * The current `web` service. A provider is registered by calling a method on
 * this service; the `webSearchProviders` registry object it replaced no longer
 * exists, so writing to that object alone registers nothing (silently).
 */
interface DshWeb {
    registerSearchProvider(provider: WebSearchProvider): () => void;
}
interface DshWebServer {
    register(opts: {
        kind: 'exact';
        path: string;
        handler: (req: unknown, res: unknown) => void | Promise<void>;
    }): void;
}
interface DshCredentials {
    resolve: (ref: string) => Promise<{
        value?: string;
    }>;
}
export declare const Config: Schema<Schemastery.ObjectS<NoInfer<{
    maxResults: Schema<number, number, "defined">;
    searchTimeoutMs: Schema<number, number, "defined">;
    tavilyBaseURL: Schema<string, string, "volatile-defined">;
    serperBaseURL: Schema<string, string, "volatile-defined">;
    defaultChannel: Schema<string, string, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    maxResults: Schema<number, number, "defined">;
    searchTimeoutMs: Schema<number, number, "defined">;
    tavilyBaseURL: Schema<string, string, "volatile-defined">;
    serperBaseURL: Schema<string, string, "volatile-defined">;
    defaultChannel: Schema<string, string, "volatile-defined">;
}>>, "plain">;
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
    available(ctx: unknown, signal?: AbortSignal): boolean | Promise<boolean>;
    search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult>;
}
export declare const name = "dsh-web-search";
export declare const inject: string[];
export declare function apply(ctx: DshContext, config: ConfigType): void;
export {};
//# sourceMappingURL=index.d.ts.map