import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useTheme } from 'next-themes';
import { LogEntry } from './types';
import { RefreshCw, Power, Trash2, Cpu } from 'lucide-react';

interface ConsoleViewProps {
    logs: LogEntry[];
    onCommand?: (cmd: string) => void;
    isConnected: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    isRunning?: boolean;
    onRestart?: () => void;
}

const darkTheme = {
    background: '#0a0c10',
    foreground: '#cccccc',
    cursor: '#cccccc',
    selectionBackground: '#5a5a5a',
    black: '#000000',
    red: '#ef4444',
    green: '#10b981',
    yellow: '#eab308',
    blue: '#3b82f6',
    magenta: '#d946ef',
    cyan: '#06b6d4',
    white: '#ffffff',
};

const lightTheme = {
    background: '#ffffff',
    foreground: '#09090b',
    cursor: '#09090b',
    selectionBackground: '#e4e4e7',
    black: '#000000',
    red: '#ef4444',
    green: '#10b981',
    yellow: '#eab308',
    blue: '#3b82f6',
    magenta: '#d946ef',
    cyan: '#06b6d4',
    white: '#ffffff',
};

export function ConsoleView({ logs, onCommand, isConnected, onConnect, onDisconnect, isRunning, onRestart }: ConsoleViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const lastLogIndex = useRef<number>(0);
    const { resolvedTheme } = useTheme();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [mounted, setMounted] = useState(false);

    // Track previous isRunning state to detect completion
    const prevIsRunning = useRef(isRunning);
    const isRunningRef = useRef(isRunning);

    useEffect(() => {
        isRunningRef.current = isRunning;
    }, [isRunning]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Helper to format logs
    const writeLog = (term: Terminal, log: LogEntry) => {
        const time = `\x1b[90m[${log.timestamp}]\x1b[0m`;
        let color = '\x1b[0m'; // Default reset
        if (log.type === 'error') color = '\x1b[31m'; // Red
        else if (log.type === 'system') color = '\x1b[32m'; // Green
        else if (log.type === 'stdout') color = '\x1b[0m'; // Default foreground
        else if (log.type === 'ai') color = '\x1b[35m'; // Magenta

        // Normalize newlines for xterm
        let content = (log.content || "").toString();

        // Handle literal escaped \n strings
        content = content.replace(/\\n/g, '\n');
        content = content.replace(/\\t/g, '\t');

        // Filter verbose tracebacks for errors
        // if (log.type === 'error') {
        //     if (content.includes('Traceback') || content.includes('---------------------------------------------------------------------------')) {
        //         const lines = content.split('\n');
        //         for (let i = lines.length - 1; i >= 0; i--) {
        //             const line = lines[i].trim();
        //             if (line) {
        //                 content = line;
        //                 break;
        //             }
        //         }
        //     }
        // }

        // Normalize to CRLF
        const normalizedContent = content.replace(/\r?\n/g, '\r\n');

        // Eğer içerik '\r' ile başlıyorsa, bu bir ilerleme güncellemesidir.
        // Zaman damgası ve yeni satır eklemeden doğrudan yazdır.
        if (content.startsWith('\r')) {
            term.write(normalizedContent);
        } else {
            term.write(`${time} ${color}${normalizedContent}\x1b[0m\r\n`);
        }
    };

    // React to connection status changes
    useEffect(() => {
        const term = terminalRef.current;
        if (!term) return;

        if (isConnected) {
            term.write('\x1b[32m> Connected to Kernel.\x1b[0m\r\n$ ');
            term.focus();
        } else {
            term.write('\r\n\x1b[31m> Disconnected from Kernel.\x1b[0m\r\n');
        }
    }, [isConnected]);

    // Initial Setup
    useEffect(() => {
        if (!containerRef.current) return;

        const term = new Terminal({
            theme: resolvedTheme === 'dark' ? darkTheme : lightTheme,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 12,
            lineHeight: 1.4,
            cursorBlink: true,
            convertEol: true,
            disableStdin: false,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(containerRef.current);
        fitAddon.fit();

        terminalRef.current = term;
        fitAddonRef.current = fitAddon;

        if (!isConnected) {
            term.write('\x1b[90m> Kernel disconnected. Click "Connect" to start a session.\x1b[0m\r\n');
        }

        if (logs.length > 0) {
            logs.forEach(log => writeLog(term, log));
            lastLogIndex.current = logs.length;
            term.scrollToBottom();
        }

        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                fitAddon.fit();
            });
        });
        resizeObserver.observe(containerRef.current);

        return () => {
            term.dispose();
            resizeObserver.disconnect();
            terminalRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isConnectedRef = useRef(isConnected);
    const onCommandRef = useRef(onCommand);
    const onRestartRef = useRef(onRestart);

    useEffect(() => {
        isConnectedRef.current = isConnected;
    }, [isConnected]);

    useEffect(() => {
        onCommandRef.current = onCommand;
    }, [onCommand]);

    useEffect(() => {
        onRestartRef.current = onRestart;
    }, [onRestart]);

    const commandBuffer = useRef<string>('');

    useEffect(() => {
        const term = terminalRef.current;
        if (!term) return;

        const disposable = term.onData((data) => {
            if (!isConnectedRef.current) return;
            if (isRunningRef.current) return; // Akış sırasında girdi engelle

            try {
                const safeData = String(data);
                if (!safeData) return;

                const code = safeData.charCodeAt(0);

                if (code === 13) {
                    term.write('\r\n');
                    const cmd = commandBuffer.current.trim();
                    commandBuffer.current = '';

                    if (cmd) {
                        if (cmd === 'clear') {
                            term.clear();
                            term.write('$ ');
                            return;
                        }

                        if (cmd === 'restart') {
                            term.write('\x1b[33m> Restarting Kernel...\x1b[0m\r\n');
                            if (onRestartRef.current) {
                                onRestartRef.current();
                            }
                            return;
                        }

                        if (isRunning) {
                            term.write('\x1b[33mWarning: Execution active.\x1b[0m\r\n');
                        }

                        if (onCommandRef.current) {
                            term.write('\x1b[90m> Executing...\x1b[0m\r\n');
                            onCommandRef.current(cmd);
                        } else {
                            term.write('$ ');
                        }
                    } else {
                        term.write('$ ');
                    }
                    return;
                }

                if (code === 127 || code === 8) {
                    if (commandBuffer.current.length > 0) {
                        commandBuffer.current = commandBuffer.current.slice(0, -1);
                        term.write('\b \b');
                    }
                    return;
                }

                if (code < 32) return;

                commandBuffer.current += safeData;
                term.write(safeData);
            } catch (e) {
                console.warn('Terminal error', e);
            }
        });

        return () => {
            disposable.dispose();
        };
    }, [terminalRef.current]);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.options.theme = resolvedTheme === 'dark' ? darkTheme : lightTheme;
        }
    }, [resolvedTheme]);

    useEffect(() => {
        const term = terminalRef.current;
        if (!term) return;

        if (logs.length < lastLogIndex.current) {
            term.clear();
            term.write('\x1b[32m> Console Cleared.\x1b[0m\r\n');
            lastLogIndex.current = 0;
            if (isConnected) {
                term.write('$ ');
            }
        }

        const newLogs = logs.slice(lastLogIndex.current);
        if (newLogs.length > 0) {
            newLogs.forEach(log => writeLog(term, log));
            lastLogIndex.current = logs.length;
        }

        // Eğer çalışma bittiyse (veya kesildiyse) ve prompt basılmadıysa, en sona prompt ekle
        if (prevIsRunning.current && !isRunning && isConnected) {
            // Küçük bir gecikme ekleyerek logların tamamlandığından emin olalım
            setTimeout(() => {
                term.write('\r\n$ ');
                term.scrollToBottom();
            }, 50);
        }

        // Ref'i log işlemleri ve prompt kontrolünden SONRA güncelle
        prevIsRunning.current = isRunning;
    }, [logs, isConnected, isRunning]);

    const handleClear = () => {
        if (terminalRef.current) {
            terminalRef.current.clear();
            terminalRef.current.write('\x1b[32m> Console Cleared.\x1b[0m\r\n');
            if (isConnected) terminalRef.current.write('$ ');
        }
    };

    return (
        <div className="flex flex-col w-full h-full bg-white dark:bg-[#0a0c10] overflow-hidden">
            {/* Console Toolbar */}
            <div className="flex items-center justify-between px-3 h-9 border-b border-border/40 bg-muted/10 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500 animate-pulse'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                        <Cpu className="h-3 w-3" />
                        Kernel Konsolu {isConnected ? '(Aktif)' : '(Çevrimdışı)'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleClear}
                        className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-all"
                        title="Konsolu Temizle"
                    >
                        <Trash2 className="h-3 w-3" />
                        TEMİZLE
                    </button>
                    <div className="h-4 w-[1px] bg-border/40 mx-1" />
                    <button
                        onClick={isConnected ? onDisconnect : onConnect}
                        className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border ${isConnected
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/20'
                            : 'bg-blue-600 hover:bg-blue-700 text-white border-transparent'}`}
                    >
                        {isConnected ? <Power className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
                        {isConnected ? 'KES' : 'YENİLE'}
                    </button>
                </div>
            </div>

            {/* Terminal Container */}
            <div className="flex-1 min-h-0 w-full pl-2 pt-1" ref={containerRef} />
        </div>
    );
}
