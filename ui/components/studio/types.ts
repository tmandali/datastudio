export type ViewMode = 'explorer' | 'editor';
export type LayoutMode = 'horizontal' | 'vertical';
export type TabType = 'table' | 'logs' | 'catalog' | 'terminal';
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';
export type LanguageType = 'python' | 'sql' | 'jupyter' | 'markdown' | 'json' | 'system';

export interface LogEntry {
    type: 'stdout' | 'error' | 'system' | 'ai';
    content: string;
    timestamp: string;
}

export interface ProjectFile {
    id: string;
    name: string;
    path: string;
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

export interface TableColumn {
    name: string;
    type: string;
}

export interface TableData {
    columns: string[];
    columnInfo?: TableColumn[];
    data: Record<string, unknown>[];
    executionTime?: string;
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
