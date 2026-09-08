import React from 'react';
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client';
interface Connection {
    api: {
        credentials: {
            describe(opts: {
                refs: string[];
            }): Promise<{
                result: {
                    ok: boolean;
                    value: {
                        credentials: Record<string, {
                            configured: boolean;
                        }>;
                    };
                };
            }>;
            set(opts: {
                ref: string;
                value: string;
            }): Promise<void>;
        };
    };
}
export declare const name = "dsh-web-search-client";
export declare const inject: readonly ["slots", "settingsScope", "connection"];
interface ClientContext {
    slots: {
        inject(key: string, factory: () => unknown): () => void;
        register(opts: {
            name: string;
            id: string;
            order?: number;
            label?: string;
            inject?: () => Record<string, unknown>;
        }, comp: React.FC<Record<string, unknown>>): () => void;
    };
    settingsScope: {
        bind<T>(spec: {
            namespace: string;
        }): SettingsScope<T>;
    };
    get(key: string): Connection;
}
export declare function apply(ctx: ClientContext): void;
export {};
//# sourceMappingURL=index.d.ts.map