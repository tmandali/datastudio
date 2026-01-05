"use client"
import { cn } from "@/lib/utils"

import { AppSidebar } from "@/components/app-sidebar"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/breadcrumb"
import { Separator } from "@/components/separator"
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/sidebar"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/studio-resizable"
import { PythonIcon, SqlIcon, JupyterIcon, MarkdownIcon, JsonIcon, PackageIcon, RequirementsIcon, EnvIcon } from "@/components/file-icons"
import { Play, Save, Square, Trash2, Server, Cpu, HardDrive, Link, Fingerprint, Hash, ExternalLink, RefreshCw } from "lucide-react"
import { Editor, EditorHandle } from "@/components/studio/Editor"
import { OutputPanel } from "@/components/studio/OutputPanel"
import { useState, useEffect, useRef, useCallback } from "react"
import { LogEntry, ProjectFile, TabType, TableData, ConnectionStatus, KernelMessage, SystemInfo, LanguageType } from "@/components/studio/types"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/hover-card"

import { useParams } from "next/navigation"
import { Suspense } from "react"

function WorkspaceContent() {
    const params = useParams();
    const currentWorkspace = params.workspaceId as string;

    const [activeTab, setActiveTab] = useState<TabType>('logs');
    const [isRunning, setIsRunning] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const [wsStatus, setWsStatus] = useState<ConnectionStatus>('connecting');
    const [availableTables, setAvailableTables] = useState<string[]>([]);
    const [isRefreshingSchema, setIsRefreshingSchema] = useState(false);
    const [activeTable, setActiveTable] = useState<TableData | null>(null);
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [hasExecutionError, setHasExecutionError] = useState(false);

    const [isEditingName, setIsEditingName] = useState(false);
    const [editingValue, setEditingValue] = useState('');

    const socketRef = useRef<WebSocket | null>(null);
    const contentCacheRef = useRef<Record<string, string>>({});
    const editorRef = useRef<EditorHandle>(null);
    const startTimeRef = useRef<number>(0);
    const hasAutoSwitchedToTableRef = useRef<boolean>(false);

    const addLog = useCallback((type: LogEntry['type'], content: unknown): void => {
        const safeContent = (content && typeof content === 'object') ? JSON.stringify(content) : String(content || "");
        setLogs(prev => [...prev, {
            type,
            content: safeContent,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
    }, []);

    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [activeFileId, setActiveFileId] = useState<string>('');
    const API_BASE = (process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8000").replace("ws://", "http://").replace("wss://", "https://").split('/ws')[0];
    const WORKSPACES_ROOT = process.env.NEXT_PUBLIC_WORKSPACES_ROOT || ".datastudio/workspaces";

    const fetchFiles = useCallback(async () => {
        try {
            const rootPath = currentWorkspace ? `${WORKSPACES_ROOT}/${currentWorkspace}` : "";
            const res = await fetch(`${API_BASE}/api/files?path=${rootPath}`);
            const data = await res.json();
            if (data.files) {
                setFiles(data.files);
                // Set first file as active if none selected
                if (data.files.length > 0 && !activeFileId) {
                    setActiveFileId(data.files[0].id);
                }
            } else if (data.error) {
                addLog('error', `Dosya listesi hatası: ${data.error}`);
            }
        } catch (e) {
            addLog('error', 'Dosya listesi sunucudan alınamadı.');
        }
    }, [API_BASE, addLog, currentWorkspace]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const activeFile = files.find(f => f.id === activeFileId) || files[0] || { id: '', name: '', content: '', language: 'python' as LanguageType };

    const fetchFileContent = useCallback(async (path: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/files/${path}`);
            const data = await res.json();
            if (data.content !== undefined) {
                setFiles(prev => prev.map(f =>
                    f.id === path ? { ...f, content: data.content } : f
                ));
            } else if (data.error) {
                addLog('error', `Dosya içeriği hatası: ${data.error}`);
            }
        } catch (e) {
            addLog('error', `Dosya içeriği sunucudan alınamadı: ${path}`);
        }
    }, [API_BASE, addLog]);

    useEffect(() => {
        if (activeFileId && activeFile && activeFile.content === "") {
            fetchFileContent(activeFile.id);
        }
    }, [activeFileId, activeFile, fetchFileContent]);

    const handleFileClick = (fileItem: { id: string }) => {
        setActiveFileId(fileItem.id);
    };

    const handleContentChange = useCallback((newContent: string) => {
        contentCacheRef.current[activeFileId] = newContent;
        setFiles(prev => prev.map(f => {
            if (f.id === activeFileId) {
                const isChanged = f.content !== newContent;
                return { ...f, content: newContent, updatedAt: new Date().toISOString(), isDirty: isChanged || f.isDirty };
            }
            return f;
        }));
    }, [activeFileId]);

    const addNewFile = async (type: LanguageType) => {
        let extension = 'txt';
        let defaultContent = '';

        switch (type) {
            case 'python':
                extension = 'py';
                defaultContent = '# Python script';
                break;
            case 'sql':
                extension = 'sql';
                defaultContent = '-- SQL query';
                break;
            case 'jupyter':
                extension = 'ipynb';
                defaultContent = '{"cells": [], "metadata": {}, "nbformat": 4, "nbformat_minor": 5}';
                break;
            case 'markdown':
                extension = 'md';
                defaultContent = '# New Document';
                break;
            case 'json':
                extension = 'json';
                defaultContent = '{\n  \n}';
                break;
        }

        const typeFiles = files.filter(f => f.language === type);
        const newName = `new_file_${typeFiles.length + 1}.${extension}`;

        try {
            const res = await fetch(`${API_BASE}/api/files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newName,
                    language: type,
                    content: defaultContent,
                    path: currentWorkspace ? `.datastudio/${currentWorkspace}` : ""
                })
            });
            const data = await res.json();
            if (data.file) {
                setFiles(prev => [...prev, data.file]);
                setActiveFileId(data.file.id);
                addLog('system', `Yeni dosya oluşturuldu: ${newName}`);
            } else {
                addLog('error', `Dosya oluşturulamadı: ${data.error}`);
            }
        } catch (e) {
            addLog('error', 'Sunucu bağlantı hatası.');
        }
    };

    const deleteFile = async (id: string) => {
        if (files.length <= 1) return;

        try {
            const res = await fetch(`${API_BASE}/api/files/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setFiles(prev => prev.filter(f => f.id !== id));
                if (activeFileId === id) {
                    setActiveFileId(files.find(f => f.id !== id)?.id || files[0].id);
                }
                addLog('system', 'Dosya silindi.');
            } else {
                addLog('error', 'Dosya silinemedi.');
            }
        } catch (e) {
            addLog('error', 'Sunucu bağlantı hatası.');
        }
    };

    const startEditing = () => {
        // Prevent renaming system files (.env, requirements.txt)
        if (activeFile.language === 'system') {
            addLog('system', 'Sistem dosyalarının adı değiştirilemez.');
            return;
        }
        setEditingValue(activeFile.name.replace(/\.[^/.]+$/, ""));
        setIsEditingName(true);
    };

    const handleNameSubmit = async () => {
        const currentExt = activeFile.name.split('.').pop();
        const cleanName = editingValue.trim();

        if (cleanName && cleanName !== activeFile.name.replace(/\.[^/.]+$/, "")) {
            const finalName = `${cleanName}.${currentExt}`;
            const newPath = activeFile.path.split('/').slice(0, -1).concat(finalName).join('/');

            try {
                const res = await fetch(`${API_BASE}/api/files/${activeFile.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: newPath })
                });

                if (res.ok) {
                    let newLang: LanguageType = 'python';
                    if (finalName.endsWith('.sql')) newLang = 'sql';
                    else if (finalName.endsWith('.ipynb')) newLang = 'jupyter';
                    else if (finalName.endsWith('.md')) newLang = 'markdown';
                    else if (finalName.endsWith('.json')) newLang = 'json';

                    setFiles(prev => prev.map(f =>
                        f.id === activeFileId ? { ...f, name: finalName, id: newPath, path: newPath, language: newLang } : f
                    ));
                    setActiveFileId(newPath);
                    // Update cache
                    if (contentCacheRef.current[activeFileId]) {
                        contentCacheRef.current[newPath] = contentCacheRef.current[activeFileId];
                        delete contentCacheRef.current[activeFileId];
                    }
                    addLog('system', `Dosya yeniden adlandırıldı: ${finalName}`);
                } else {
                    const err = await res.json();
                    addLog('error', `Yeniden adlandırma hatası: ${err.error || 'Bilinmeyen hata'}`);
                }
            } catch (e) {
                addLog('error', 'Sunucu bağlantı hatası.');
            }
        }
        setIsEditingName(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleNameSubmit();
        if (e.key === 'Escape') setIsEditingName(false);
    };

    const handleSave = useCallback(async () => {
        if (!activeFileId || !activeFile) return;

        // Use cached content if available to ensure we have the absolute latest
        const contentToSave = contentCacheRef.current[activeFileId] ?? activeFile.content;

        try {
            addLog('system', `Kaydediliyor: ${activeFile.name}...`);
            const safeId = activeFile.id.split('/').map(segment => encodeURIComponent(segment)).join('/');

            const res = await fetch(`${API_BASE}/api/files/${safeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: contentToSave,
                    format: activeFile.language === 'jupyter' ? 'json' : 'text'
                })
            });

            if (res.ok) {
                setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: contentToSave, isDirty: false } : f));
                addLog('system', `Başarıyla kaydedildi: ${activeFile.name}`);
            } else {
                const errorData = await res.json().catch(() => ({ detail: 'Sunucu yanıt vermedi' }));
                addLog('error', `Kaydetme hatası (${res.status}): ${errorData.detail || activeFile.name}`);
            }
        } catch (e) {
            addLog('error', `Sunucuya bağlanılamadı: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`);
        }
    }, [API_BASE, activeFile, activeFileId, addLog]);

    const refreshSchema = useCallback(() => {
        if (wsStatus !== 'connected' || !socketRef.current) return;
        setIsRefreshingSchema(true);
        const cmd = `import pandas as pd; import json; print("__SCHEMA_START__" + json.dumps([k for k, v in globals().items() if isinstance(v, pd.DataFrame)]) + "__SCHEMA_END__")`;
        socketRef.current.send(JSON.stringify({ action: 'execute', code: cmd, mode: 'python' }));
    }, [wsStatus]);

    const [refreshKey, setRefreshKey] = useState(0);

    // --- KERNEL CONNECTION ---
    // Using refs to keep connect/disconnect functions stable
    const connectWSRef = useRef<() => void>(() => { });
    const disconnectWSRef = useRef<() => void>(() => { });

    useEffect(() => {
        let isMounted = true;
        let reconnectTimeout: NodeJS.Timeout;

        const connectWS = () => {
            if (!isMounted) return;
            // If already connected or connecting, maybe don't reconnect unless forced?
            // but here we just blindly recreate.
            if (socketRef.current?.readyState === WebSocket.OPEN) return;

            setWsStatus('connecting');
            let wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:8000/ws/execute";
            if (currentWorkspace) {
                wsUrl += `?workspace=${currentWorkspace}`;
            }
            const ws = new WebSocket(wsUrl);
            ws.binaryType = "blob";
            ws.onopen = () => {
                if (!isMounted) return;
                // Silent connection
            };
            ws.onmessage = async (event: MessageEvent) => {
                if (!isMounted) return;
                if (event.data instanceof Blob) {
                    try {
                        const buffer = await event.data.arrayBuffer();
                        const { tableFromIPC } = await import('apache-arrow');
                        const table = tableFromIPC(new Uint8Array(buffer));

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

                        const duration = performance.now() - startTimeRef.current;
                        const ms = Math.floor(duration % 1000);
                        const seconds = Math.floor((duration / 1000) % 60);
                        const minutes = Math.floor((duration / (1000 * 60)) % 60);
                        const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

                        const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;

                        setActiveTable(prev => {
                            // Eğer önceki veri yoksa veya kolon yapısı değiştiyse yeni tablo oluştur
                            if (!prev || JSON.stringify(prev.columns) !== JSON.stringify(columns)) {
                                return { columns, data, executionTime: formattedTime };
                            }
                            // Aynı yapıdaysa veriyi sona ekle (Streaming/Append)
                            return {
                                ...prev,
                                data: [...prev.data, ...data],
                                executionTime: formattedTime
                            };
                        });

                        // Sadece ilk pakette tabloya otomatik geç, sonra kullanıcıyı serbest bırak
                        if (!hasAutoSwitchedToTableRef.current) {
                            hasAutoSwitchedToTableRef.current = true;
                            setActiveTab('table');
                        }
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
                            setActiveTab('logs');
                            return;
                        }

                        if (text.includes("__SCHEMA_START__")) {
                            const list = JSON.parse(text.split("__SCHEMA_START__")[1].split("__SCHEMA_END__")[0]);
                            setAvailableTables(list);
                            setIsRefreshingSchema(false);
                        } else if (text.includes("__SYS_INFO__")) {
                            const info = JSON.parse(text.split("__SYS_INFO__")[1].split("__SYS_INFO_END__")[0]);
                            setSystemInfo(info);
                        } else if (data.type === 'stdout') {
                            addLog('stdout', text);
                            // Eğer stdout içinde kritik bir hata mesajı geçiyorsa yine de uyar
                            if (text.toLowerCase().includes('error:') || text.toLowerCase().includes('exception:')) {
                                setHasExecutionError(true);
                                setActiveTab('logs');
                            }
                        } else if (data.type === 'error') {
                            addLog('error', text);
                            setHasExecutionError(true);
                            setActiveTab('logs');
                        } else if (data.type === 'done') {
                            setIsRunning(false);
                            setIsStopping(false);
                        }
                    } catch (e) {
                        console.error("Message handling error:", e);
                    }
                }
            };
            ws.onclose = () => {
                if (!isMounted) return;
                setWsStatus('disconnected');
                // Auto-reconnect removed if we want manual control? 
                // Or keep it but allow manual disconnect to stop it.
                // Let's keep auto-reconnect for now, but manual disconnect will stop it.
                // Actually, if user clicks Disconnect, we probably shouldn't auto reconnect immediately.
                // But for simplicity, let's just let it be.
                reconnectTimeout = setTimeout(connectWS, 5000);
            };
            socketRef.current = ws;
        };

        const disconnectWS = () => {
            if (socketRef.current) {
                // Prevent auto-reconnect temporarily?
                // Clearing timeout is not enough if onclose creates a new one.
                // But onclose checks isMounted? No, isMounted is for component unmount.
                // We need a flag "isManuallyDisconnected"?
                // For now, just close.
                socketRef.current.close();
                setWsStatus('disconnected');
            }
        };

        connectWSRef.current = connectWS;
        disconnectWSRef.current = disconnectWS;

        connectWS();

        return () => {
            isMounted = false;
            clearTimeout(reconnectTimeout);
            if (socketRef.current) {
                socketRef.current.onclose = null;
                socketRef.current.close();
            }
        };
    }, [addLog, refreshKey, currentWorkspace]);

    // Wrappers to call refs
    const handleManualConnect = () => {
        connectWSRef.current();
    };

    const handleManualDisconnect = () => {
        // We might need to ensure auto-reconnect doesn't kick in immediately
        // But simpler logic for now.
        disconnectWSRef.current();
    };

    const handleKernelReset = () => {
        setLogs([]); // Clear logs for a fresh start
        setSystemInfo(null); // Clear old info
        setRefreshKey(prev => prev + 1); // Trigger re-effect
    };

    const runCode = useCallback((): void => {
        if (wsStatus !== 'connected') return;

        const selection = editorRef.current?.getSelection();
        let codeToRun = selection || "";

        if (!codeToRun.trim()) {
            codeToRun = contentCacheRef.current[activeFileId] ?? activeFile.content;
        }

        setLogs([]);
        setHasExecutionError(false);
        setActiveTable(null);
        hasAutoSwitchedToTableRef.current = false; // Reset for new run
        setIsRunning(true);
        setIsStopping(false);
        startTimeRef.current = performance.now();
        addLog('system', `Çalıştırılıyor: ${activeFile.name} ${selection ? '(Seçili Alan)' : ''}`);

        socketRef.current?.send(JSON.stringify({
            action: 'execute',
            code: codeToRun,
            mode: activeFile.language,
            filename: activeFile.name
        }));
        setTimeout(refreshSchema, 2000);
    }, [wsStatus, activeFileId, activeFile.content, activeFile.name, activeFile.language, addLog, refreshSchema]);

    const runSpecificCode = useCallback((code: string): void => {
        if (wsStatus !== 'connected') return;

        setLogs([]);
        setHasExecutionError(false);
        setActiveTable(null);
        hasAutoSwitchedToTableRef.current = false; // Reset for new run
        setIsRunning(true);
        setIsStopping(false);
        startTimeRef.current = performance.now();
        addLog('system', `Bağımsız sorgu çalıştırılıyor...`);

        socketRef.current?.send(JSON.stringify({
            action: 'execute',
            code: code,
            mode: activeFile.language,
            filename: activeFile.name
        }));
    }, [wsStatus, activeFile.language, activeFile.name, addLog]);

    const handleTerminalCommand = (cmd: string) => {
        if (!socketRef.current || wsStatus !== 'connected') {
            return;
        }

        setHasExecutionError(false);
        setActiveTable(null);
        setIsRunning(true);
        socketRef.current.send(JSON.stringify({
            action: 'execute',
            code: cmd,
            mode: 'python'
        }));
    };

    // --- KEYBOARD SHORTCUTS ---
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + Enter to run code
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                if (!isRunning && wsStatus === 'connected') {
                    e.preventDefault();
                    runCode();
                }
            }
            // Cmd/Ctrl + S to save
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isRunning, wsStatus, runCode, handleSave]);

    return (
        <SidebarProvider className="h-screen overflow-hidden">
            <AppSidebar
                files={files}
                onFileClick={(file) => setActiveFileId(file.id)}
                onAddFile={addNewFile}
            />
            <SidebarInset>
                <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 px-4 sticky top-0 z-10 bg-background/95 backdrop-blur">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbLink href="/">
                                        Workspaces
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>{currentWorkspace}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        <HoverCard openDelay={200}>
                            <HoverCardTrigger asChild>
                                <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-muted/40 border border-border/20 text-[10px] font-medium text-muted-foreground whitespace-nowrap cursor-help transition-colors hover:bg-muted/60">
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
                    </div>
                </header>
                <div className="flex flex-1 flex-col p-0 h-[calc(100vh-3rem)]">
                    <ResizablePanelGroup orientation="horizontal" className="h-full overflow-hidden">
                        <ResizablePanel defaultSize={60}>
                            <div className="h-full w-full flex flex-col">
                                <div className="flex items-center justify-between px-3 h-9 border-b border-border/40 bg-muted/10 backdrop-blur-sm shrink-0">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex items-center justify-center">
                                            {(activeFile.language === 'python') && <PythonIcon className="h-4 w-4" />}
                                            {activeFile.language === 'sql' && <SqlIcon className="h-4 w-4" />}
                                            {activeFile.language === 'jupyter' && <JupyterIcon className="h-4 w-4" />}
                                            {activeFile.language === 'markdown' && <MarkdownIcon className="h-4 w-4" />}
                                            {activeFile.language === 'json' && <JsonIcon className="h-4 w-4" />}
                                            {activeFile.language === 'system' && (
                                                activeFile.name === 'requirements.txt'
                                                    ? <RequirementsIcon className="h-4 w-4 text-purple-500" />
                                                    : <EnvIcon className="h-4 w-4 text-emerald-500" />
                                            )}
                                        </div>
                                        {isEditingName ? (
                                            <input
                                                autoFocus
                                                className="bg-background/50 border border-primary/30 rounded px-1.5 py-0.5 text-[10px] font-medium focus:outline-none focus:ring-1 focus:ring-primary/50 w-full max-w-[200px]"
                                                value={editingValue}
                                                onChange={(e) => setEditingValue(e.target.value)}
                                                onBlur={handleNameSubmit}
                                                onKeyDown={handleKeyDown}
                                            />
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={cn(
                                                        "text-[10px] font-medium text-foreground/90 transition-all flex items-center gap-2",
                                                        activeFile.language !== 'system' && "cursor-pointer hover:text-primary"
                                                    )}
                                                    onClick={startEditing}
                                                    title={activeFile.language === 'system' ? "Sistem dosyası (Adı değiştirilemez)" : "İsmi değiştirmek için tıkla"}
                                                >
                                                    {activeFile.name.replace(/\.[^/.]+$/, "")}
                                                    <span className="text-[9px] opacity-40 font-normal tracking-normal">.{activeFile.name.split('.').pop()}</span>
                                                </span>
                                                {activeFile.isDirty && (
                                                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8_rgba(59,130,246,0.5)]" />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleSave}
                                            disabled={!activeFile.isDirty}
                                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold transition-all ${activeFile.isDirty
                                                ? 'text-blue-500 hover:bg-blue-500/10'
                                                : 'text-muted-foreground/40 cursor-not-allowed opacity-50'}`}
                                            title="Kaydet (Cmd+S)"
                                        >
                                            <Save className="h-3 w-3" />
                                            KAYDET
                                        </button>

                                        {activeFile.language !== 'system' && (
                                            <button
                                                onClick={() => deleteFile(activeFile.id)}
                                                className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                title="Dosyayı Sil"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}

                                        <div className="h-4 w-[1px] bg-border/40 mx-1" />

                                        <button
                                            onClick={isRunning ? () => {
                                                setIsStopping(true);
                                                socketRef.current?.send(JSON.stringify({ action: 'interrupt' }));
                                            } : runCode}
                                            disabled={(!isRunning && wsStatus !== 'connected') || isStopping}
                                            className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border ${isRunning
                                                ? isStopping
                                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                                    : 'bg-red-500/10 hover:bg-red-500/20 text-red-600 border-red-500/20 animate-pulse'
                                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/20'}`}
                                            title={isRunning ? (isStopping ? "Durduruluyor..." : "Durdur") : "Çalıştır (Cmd+Enter)"}
                                        >
                                            {isRunning ? <Square className={cn("h-3 w-3 fill-current", isStopping && "animate-spin")} /> : <Play className="h-3 w-3 fill-current" />}
                                            {isRunning ? (isStopping ? 'DURDURULUYOR...' : 'DURDUR') : 'ÇALIŞTIR'}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <Editor
                                        ref={editorRef}
                                        activeFile={activeFile}
                                        viewMode="editor"
                                        onContentChange={handleContentChange}
                                        onRunCode={runSpecificCode}
                                    />
                                </div>
                            </div>
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={40}>
                            <div className="h-full w-full">
                                <OutputPanel
                                    activeTab={activeTab}
                                    availableTables={availableTables}
                                    isRefreshingSchema={isRefreshingSchema}
                                    logs={logs}
                                    activeTable={activeTable}
                                    isRunning={isRunning}
                                    onTabChange={setActiveTab}
                                    onRefreshSchema={refreshSchema}
                                    onTerminalCommand={handleTerminalCommand}
                                    status={wsStatus}
                                    onConnect={handleManualConnect}
                                    onDisconnect={handleManualDisconnect}
                                    onRestart={handleKernelReset}
                                    hasError={hasExecutionError}
                                />
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default function Page() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading Workspace...</div>}>
            <WorkspaceContent />
        </Suspense>
    )
}
