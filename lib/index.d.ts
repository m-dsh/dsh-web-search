import Schema from "@deepseek-ai/schemastery";

//#region src/index.d.ts

interface DshContext {
  settings: {
    set: (ns: string, key: string, value: unknown) => void;
    register(ns: unknown, schema: unknown, opts?: {
      base?: unknown;
      applies?: string;
    }): void;
  };
  get(key: 'webServer'): DshWebServer | undefined;
  get(key: 'credentials'): DshCredentials | undefined;
  get(key: 'webSearchProviders'): Record<string, WebSearchProvider> | undefined;
  get(key: string): unknown;
  on(event: string, handler: (...args: unknown[]) => void): void;
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
declare const Config: Schema<Schemastery.ObjectS<{
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
type ConfigType = ReturnType<typeof Config>;
declare module '@deepseek-ai/cordis' {
  interface Events {}
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
declare const name = "dsh-web-search";
declare const inject: string[];
declare function apply(ctx: DshContext, config: ConfigType): void;
//#endregion
export { Config, ConfigType, apply, inject, name };