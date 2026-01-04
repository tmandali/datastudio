export type ViewMode = 'explorer' | 'editor';
export type LayoutMode = 'horizontal' | 'vertical';
export type TabType = 'table' | 'logs' | 'catalog';
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';
export type LanguageType = 'python' | 'sql';

export interface LogEntry {
    type: 'stdout' | 'error' | 'system' | 'ai';
    content: string;
    timestamp: string;
}

export interface ProjectFile {
    id: string;
    name: string;
    content: string;
    language: LanguageType;
    updatedAt: string;
    size: string;
    isDirty?: boolean;
}

export interface KernelMessage {
    type: 'stdout' | 'error' | 'done';
    text?: string;
    content?: unknown;
}

export interface TableData {
    columns: string[];
    data: Record<string, unknown>[];
}

export interface SystemInfo {
    python: string;
    os: string;
    ram_total: string;
    ram_available: string;
    processor: string;
    kernel_id?: string;
    session_id?: string;
    jupyter_url?: string;
    session_link?: string;
}
