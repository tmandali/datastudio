"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Play, Square, FileCode, CheckCircle2, XCircle, Save, Server, Cpu, HardDrive, Link, Fingerprint, Hash, ExternalLink, RefreshCw
} from 'lucide-react';

import { Editor } from './components/Editor';
import { OutputPanel } from './components/OutputPanel';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import {
    ViewMode, TabType, ConnectionStatus, LanguageType,
    LogEntry, ProjectFile, KernelMessage, TableData, SystemInfo
} from './components/types';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/studio-resizable";
import { Button } from "@/components/button";
import { Separator } from "@/components/separator";
import { ModeToggle } from "@/components/mode-toggle";
import {
    SidebarProvider,
    SidebarInset,
    SidebarTrigger,
} from "@/components/sidebar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/hover-card";

// --- MOCK DATA ---
const defaultFiles: ProjectFile[] = [
    {
        id: 'f1',
        name: 'analiz_ana.py',
        language: 'python',
        updatedAt: 'ŞİMDİ',
        size: '1.4 KB',
        content: "import pandas as pd\nimport numpy as np\n\n# Veri seti hazırlığı\ndf = pd.DataFrame({\n    'urun': ['Elma', 'Armut', 'Muz', 'Çilek'],\n    'stok': [150, 200, 80, 120],\n    'fiyat': [15, 25, 40, 30]\n})\nprint(\"Python: 'df' tablosu hazır.\")\ndf"
    },
    {
        id: 'f2',
        name: 'stok_sorgu.sql',
        language: 'sql',
        updatedAt: '1 SAAT ÖNCE',
        size: '0.6 KB',
        content: "-- Python DataFrame'lerini SQL ile sorgulayın\nSELECT * FROM df WHERE stok > 100\nORDER BY stok DESC"
    },
    {
        id: 'f3',
        name: 'istatistik.py',
        language: 'python',
        updatedAt: 'DÜN',
        size: '2.5 KB',
        content: "import numpy as np\nprint('İstatistiksel hesaplamalar başlatılıyor...')"
    }
];

export default function WorkspacePage() {
    // --- STATE ---
    const [viewMode] = useState<ViewMode>('editor');
    const [activeTab, setActiveTab] = useState<TabType>('table');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [availableTables, setAvailableTables] = useState<string[]>(['satis_verileri', 'stok_analizi']);
    const [isRefreshingSchema, setIsRefreshingSchema] = useState<boolean>(false);
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
    const [activeTable, setActiveTable] = useState<TableData | null>(null);

    const [isEditingName, setIsEditingName] = useState(false);
    const [editingValue, setEditingValue] = useState('');

    const [files, setFiles] = useState<ProjectFile[]>(defaultFiles);
    const [activeFileId, setActiveFileId] = useState<string>('f1');
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [wsStatus, setWsStatus] = useState<ConnectionStatus>('connecting');

    // --- REFS ---
    const socketRef = useRef<WebSocket | null>(null);
    const contentCacheRef = useRef<Record<string, string>>({});

    // --- MEMOIZED DATA ---
    const activeFile = useMemo(() =>
        files.find(f => f.id === activeFileId) || files[0],
        [files, activeFileId]);

    // --- ACTIONS ---
    const addLog = useCallback((type: LogEntry['type'], content: unknown): void => {
        const safeContent = (content && typeof content === 'object') ? JSON.stringify(content) : String(content || "");
        setLogs(prev => [...prev, {
            type,
            content: safeContent,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
    }, []);

    const refreshSchema = useCallback(() => {
        if (wsStatus !== 'connected' || !socketRef.current) return;
        setIsRefreshingSchema(true);
        const cmd = `import pandas as pd; import json; print("__SCHEMA_START__" + json.dumps([k for k, v in globals().items() if isinstance(v, pd.DataFrame)]) + "__SCHEMA_END__")`;
        socketRef.current.send(JSON.stringify({ action: 'execute', code: cmd, mode: 'python' }));
    }, [wsStatus]);

    const addNewFile = (type: LanguageType): void => {
        const ext = type === 'python' ? '.py' : '.sql';
        const newName = prompt(`Yeni dosya adı:`, `script${ext}`);
        if (newName) {
            const newId = Math.random().toString(36).substr(2, 9);
            const newFile: ProjectFile = {
                id: newId, name: newName, language: type, content: "", updatedAt: 'ŞİMDİ', size: '0 KB'
            };
            setFiles(prev => [...prev, newFile]);
            setActiveFileId(newId);
        }
    };

    const deleteFile = (id: string): void => {
        if (files.length === 1) return;
        const newFiles = files.filter(f => f.id !== id);
        setFiles(newFiles);
        if (activeFileId === id) setActiveFileId(newFiles[0].id);
    };

    const handleContentChange = (newContent: string) => {
        contentCacheRef.current[activeFileId] = newContent;
        setFiles(prev => prev.map(f => {
            if (f.id === activeFileId) {
                // If content is actually different, mark as dirty
                const isChanged = f.content !== newContent;
                return { ...f, content: newContent, updatedAt: 'ŞİMDİ', isDirty: isChanged || f.isDirty };
            }
            return f;
        }));
    };

    const handleSave = () => {
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isDirty: false } : f));
    };

    const startEditing = () => {
        setEditingValue(activeFile.name.replace(/\.[^/.]+$/, ""));
        setIsEditingName(true);
    };

    const handleNameSubmit = () => {
        const currentExt = activeFile.name.split('.').pop();
        const cleanName = editingValue.trim();

        if (cleanName && cleanName !== activeFile.name.replace(/\.[^/.]+$/, "")) {
            const finalName = `${cleanName}.${currentExt}`;
            setFiles(prev => prev.map(f =>
                f.id === activeFileId ? { ...f, name: finalName } : f
            ));
        }
        setIsEditingName(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleNameSubmit();
        if (e.key === 'Escape') setIsEditingName(false);
    };
    const saveFile = useCallback(() => {
        handleSave();
        addLog('system', `"${activeFile.name}" kaydedildi.`);
    }, [activeFileId, activeFile.name, addLog, handleSave]);

    const [refreshKey, setRefreshKey] = useState(0);

    // --- KERNEL CONNECTION ---
    useEffect(() => {
        let isMounted = true;
        let reconnectTimeout: NodeJS.Timeout;

        const connectWS = () => {
            if (!isMounted) return;
            setWsStatus('connecting');
            const ws = new WebSocket(process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8000/ws/execute");
            ws.binaryType = "blob";
            ws.onopen = () => {
                if (!isMounted) return;
                // Do not set connected yet. Wait for kernel ready signal.
                addLog('system', 'Kernel Engine Bağlandı. Kernel hazırlanıyor...');
            };
            ws.onmessage = async (event: MessageEvent) => {
                if (!isMounted) return;
                if (event.data instanceof Blob) {
                    try {
                        const buffer = await event.data.arrayBuffer();
                        const { tableFromIPC } = await import('apache-arrow');
                        const table = tableFromIPC(new Uint8Array(buffer));
                        addLog('system', `Veri Tablosu Alındı: ${table.numRows} satır, ${table.numCols} sütun.`);

                        const columns = table.schema.fields.map(f => f.name);
                        const data: Record<string, unknown>[] = [];
                        for (let i = 0; i < table.numRows; i++) {
                            const row: Record<string, unknown> = {};
                            const arrowRow = table.get(i);
                            if (arrowRow) {
                                columns.forEach(col => {
                                    row[col] = String(arrowRow[col]);
                                });
                                data.push(row);
                            }
                        }
                        setActiveTable({ columns, data });
                        setActiveTab('table');
                    } catch (e) {
                        addLog('error', 'Veri paketlenirken hata oluştu.');
                        console.error(e);
                    }
                } else {
                    try {
                        const data = JSON.parse(event.data);
                        const text = String(data.text || "");

                        // Handle Ready Signal
                        if (data.type === 'status' && data.execution_state === 'ready') {
                            setWsStatus('connected');
                            addLog('system', 'Kernel Hazır.');
                            return;
                        }

                        if (text.includes("__SCHEMA_START__")) {
                            const list = JSON.parse(text.split("__SCHEMA_START__")[1].split("__SCHEMA_END__")[0]);
                            setAvailableTables(list);
                            setIsRefreshingSchema(false);
                        } else if (text.includes("__SYS_INFO__")) {
                            const info = JSON.parse(text.split("__SYS_INFO__")[1].split("__SYS_INFO_END__")[0]);
                            setSystemInfo(info);
                        } else if (data.type === 'stdout') addLog('stdout', text);
                        else if (data.type === 'error') addLog('error', text);
                        else if (data.type === 'done') setIsRunning(false);
                    } catch (e) { addLog('error', 'Mesaj hatası.'); console.error(e); }
                }
            };
            ws.onclose = () => {
                if (!isMounted) return;
                setWsStatus('disconnected');
                reconnectTimeout = setTimeout(connectWS, 5000);
            };
            socketRef.current = ws;
        };
        connectWS();

        return () => {
            isMounted = false;
            clearTimeout(reconnectTimeout);
            if (socketRef.current) {
                socketRef.current.onclose = null; // Prevent reconnect on cleanup
                socketRef.current.close();
            }
        };
    }, [addLog, refreshKey]);

    const handleKernelReset = () => {
        setLogs([]); // Clear logs for a fresh start
        addLog('system', 'Kernel sıfırlanıyor...');
        setSystemInfo(null); // Clear old info
        setRefreshKey(prev => prev + 1); // Trigger re-effect
    };

    const runCode = (): void => {
        if (wsStatus !== 'connected') return;
        const codeToRun = contentCacheRef.current[activeFileId] || activeFile.content;

        setLogs([]);
        setIsRunning(true);
        addLog('system', `Çalıştırılıyor: ${activeFile.name}`);

        socketRef.current?.send(JSON.stringify({
            action: 'execute',
            code: codeToRun,
            mode: activeFile.language
        }));
        setTimeout(refreshSchema, 2000);
    };

    return (
        <SidebarProvider style={{ "--sidebar-width": "18rem", "--header-height": "56px" } as React.CSSProperties}>
            <WorkspaceSidebar
                files={files}
                activeFileId={activeFileId}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSelectFile={setActiveFileId}
                onDeleteFile={deleteFile}
                onAddFile={addNewFile}
            />

            <SidebarInset className="overflow-hidden flex flex-col h-screen bg-muted/5">
                {/* HEADER */}
                <header className="flex h-[--header-height] shrink-0 items-center border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-30 px-4 transition-all">
                    <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-foreground" />
                    <Separator orientation="vertical" className="mx-3 h-5" />

                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            {isEditingName ? (
                                <input
                                    autoFocus
                                    className="bg-background border border-primary/30 rounded px-1.5 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary/50 w-full max-w-[300px]"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onBlur={handleNameSubmit}
                                    onKeyDown={handleKeyDown}
                                />
                            ) : (
                                <span
                                    className="font-semibold text-sm truncate cursor-pointer hover:text-primary transition-colors hover:underline underline-offset-4 decoration-dotted"
                                    onClick={startEditing}
                                    title="İsmi değiştirmek için tıkla"
                                >
                                    {activeFile.name.replace(/\.[^/.]+$/, "")}
                                </span>
                            )}
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 border border-border/60 rounded px-1.5 py-0.5 tracking-wider shrink-0">
                                {activeFile.language}
                            </span>
                        </div>
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                        <HoverCard openDelay={200}>
                            <HoverCardTrigger asChild>
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/40 border border-border/20 text-xs font-medium text-muted-foreground cursor-help transition-colors hover:bg-muted/60">
                                    {wsStatus === 'connected' ? (
                                        <>
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                            <span>Kernel Hazır</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                            <span>Bağlanıyor...</span>
                                        </>
                                    )}
                                </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                                <div className="flex justify-between space-x-4">
                                    <div className="bg-primary/10 p-2 rounded-full h-fit">
                                        <Server className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="space-y-1 flex-1">
                                        <h4 className="text-sm font-semibold">Kernel Sunucu Bilgileri</h4>
                                        <p className="text-xs text-muted-foreground">
                                            Jupyter çekirdeği aktif ve komut bekliyor.
                                        </p>
                                        <div className="mt-3 space-y-2">
                                            <div className="flex items-center gap-2 text-[11px]">
                                                <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="font-medium">Python:</span>
                                                <span className="text-muted-foreground">{systemInfo?.python || "..."}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px]">
                                                <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="font-medium">Bellek:</span>
                                                <span className="text-muted-foreground">{systemInfo?.ram_available} / {systemInfo?.ram_total}</span>
                                            </div>

                                            <Separator className="my-2 bg-border/20" />

                                            <div className="flex items-center gap-2 text-[11px]">
                                                <Link className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="font-medium text-primary">Jupyter:</span>
                                                <span className="text-muted-foreground truncate max-w-[150px]">{systemInfo?.jupyter_url || "..."}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px]">
                                                <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="font-medium">Session:</span>
                                                <span className="text-muted-foreground font-mono text-[9px] truncate max-w-[140px]">{systemInfo?.session_id || "..."}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px]">
                                                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="font-medium">Kernel ID:</span>
                                                <span className="text-muted-foreground font-mono text-[9px] truncate max-w-[140px]">{systemInfo?.kernel_id || "..."}</span>
                                            </div>

                                            <div className="pt-2 flex gap-2">
                                                {systemInfo?.session_link && (
                                                    <a
                                                        href={systemInfo.session_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex flex-1 items-center justify-center gap-2 py-1.5 rounded bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 text-[11px] font-bold transition-colors border border-orange-500/20"
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                        Jupyter Lab
                                                    </a>
                                                )}
                                                <button
                                                    onClick={handleKernelReset}
                                                    className="flex flex-1 items-center justify-center gap-2 py-1.5 rounded bg-red-500/10 text-red-600 hover:bg-red-500/20 text-[11px] font-bold transition-colors border border-red-500/20"
                                                >
                                                    <RefreshCw className="h-3 w-3" />
                                                    Sıfırla
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </HoverCardContent>
                        </HoverCard>

                        <Separator orientation="vertical" className="h-5" />

                        <Button
                            variant={activeFile.isDirty ? "default" : "ghost"}
                            size="sm"
                            className={`h-9 px-3 gap-2 transition-all cursor-pointer ${activeFile.isDirty ? 'bg-blue-600 text-white hover:bg-blue-500' : 'text-muted-foreground'}`}
                            onClick={saveFile}
                        >
                            <Save className={`size-3.5 ${activeFile.isDirty ? 'animate-pulse' : ''}`} />
                            <span className="hidden sm:inline">Kaydet</span>
                        </Button>

                        <Separator orientation="vertical" className="h-5" />

                        <Button
                            variant={isRunning ? "destructive" : "default"}
                            size="sm"
                            className={`h-9 shadow-sm gap-2 font-medium transition-all duration-200 cursor-pointer ${isRunning ? 'bg-destructive text-destructive-foreground hover:bg-red-600 hover:text-white animate-pulse' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
                            onClick={isRunning ? () => socketRef.current?.send(JSON.stringify({ action: 'interrupt' })) : runCode}
                        >
                            {isRunning ? <Square className="fill-current size-3.5" /> : <Play className="fill-current size-3.5" />}
                            {isRunning ? "Durdur" : "Çalıştır"}
                        </Button>

                        <ModeToggle />
                    </div>
                </header>

                {/* MAIN CONTENT */}
                <div className="flex flex-1 flex-col overflow-hidden relative">
                    <ResizablePanelGroup orientation="vertical">
                        <ResizablePanel defaultSize={55} minSize={20} className="bg-background/40 backdrop-blur-sm">
                            <Editor
                                activeFile={activeFile}
                                viewMode={viewMode}
                                onContentChange={handleContentChange}
                            />
                        </ResizablePanel>

                        <ResizableHandle withHandle className="bg-border/40 hover:bg-primary/20 transition-colors" />

                        <ResizablePanel defaultSize={45} minSize={20} className="bg-muted/5 border-t border-border/40">
                            <OutputPanel
                                activeTab={activeTab}
                                availableTables={availableTables}
                                isRefreshingSchema={isRefreshingSchema}
                                logs={logs}
                                activeTable={activeTable}
                                isRunning={isRunning}
                                onTabChange={setActiveTab}
                                onRefreshSchema={refreshSchema}
                            />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>

                {/* STATUS BAR - Ultra Minimal */}
                <div className="h-7 shrink-0 border-t border-border/40 bg-muted/20 flex items-center px-4 text-[10px] font-mono text-muted-foreground justify-between select-none">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer">
                            <CheckCircle2 className="size-3 text-emerald-500/80" />
                            <span>0 Hata</span>
                        </div>
                        <div className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer">
                            <span>Ln 1, Col 1</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 opacity-70">
                        <span>UTF-8</span>
                        <span>{activeFile.size}</span>
                        <span>DataStudio v1.0.0</span>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
