import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useTheme } from 'next-themes';
import { RefreshCw } from 'lucide-react';

interface SystemTerminalProps {
    isActive: boolean;
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

export function SystemTerminal({ isActive }: SystemTerminalProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const { resolvedTheme } = useTheme();
    const [isConnected, setIsConnected] = useState(false);

    // Initialize Terminal
    useEffect(() => {
        if (!containerRef.current) return;

        const term = new Terminal({
            theme: resolvedTheme === 'dark' ? darkTheme : lightTheme,
            fontFamily: '"MesloLGM Nerd Font", "MesloLGS NF", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 13,
            lineHeight: 1.0,
            cursorBlink: true,
            convertEol: true,
            disableStdin: false,
            customGlyphs: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(containerRef.current);
        fitAddon.fit();

        terminalRef.current = term;
        fitAddonRef.current = fitAddon;

        // Resize observer
        const resizeObserver = new ResizeObserver(() => {
            if (isActive) {
                requestAnimationFrame(() => {
                    fitAddon.fit();
                    // Send resize to backend
                    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        const dims = { cols: term.cols, rows: term.rows };
                        wsRef.current.send(JSON.stringify({ type: 'resize', ...dims }));
                    }
                });
            }
        });
        resizeObserver.observe(containerRef.current);

        // Input handling
        term.onData(data => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'input', data }));
            }
        });

        // Initialize Connection with slight delay to handle React StrictMode double-mount
        const connectTimer = setTimeout(() => {
            connect(term);
        }, 50);

        return () => {
            clearTimeout(connectTimer); // Cancel connection if unmounted immediately
            term.dispose();
            resizeObserver.disconnect();
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const connect = (term: Terminal) => {
        try {
            // Derive WebSocket URL
            // Priority 1: Direct Terminal URL from env
            // Priority 2: Derived from Generic Websocket URL
            // Priority 3: Default Localhost
            const directEnvUrl = process.env.NEXT_PUBLIC_TERMINAL_WS_URL;
            const genericEnvUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
            let wsUrl: string;

            if (directEnvUrl) {
                wsUrl = directEnvUrl;
            } else if (genericEnvUrl) {
                // If generic env var is set, try to use its origin
                try {
                    const urlObj = new URL(genericEnvUrl);
                    urlObj.pathname = '/ws/terminal';
                    // Force IPv4 loopback to avoid resolution ambiguity
                    if (urlObj.hostname === 'localhost') {
                        urlObj.hostname = '127.0.0.1';
                    }
                    wsUrl = urlObj.toString();
                } catch (e) {
                    console.error("Invalid NEXT_PUBLIC_WEBSOCKET_URL", e);
                    wsUrl = "ws://127.0.0.1:8000/ws/terminal";
                }
            } else {
                wsUrl = "ws://127.0.0.1:8000/ws/terminal";
            }

            console.log("[SystemTerminal] Connecting to:", wsUrl);

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsConnected(true);
                term.write('\x1b[32m> System Terminal Connected.\x1b[0m\r\n');

                // Initial resize
                const dims = { cols: term.cols, rows: term.rows };
                ws.send(JSON.stringify({ type: 'resize', ...dims }));
            };

            ws.onmessage = (event) => {

                if (typeof event.data === 'string') {
                    // Check if it is a JSON command (rare in raw PTY but maybe used for protocol)
                    try {
                        // We are sending raw bytes mostly, but maybe mixed?
                        // Actually our backend sends bytes for PTY data
                        // But websocket.receive_text() was used for input.
                        // Wait, backend sends bytes: `await websocket.send_bytes(data)`
                    } catch (e) { }
                }

                // If blob (binary), read it
                if (event.data instanceof Blob) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const text = reader.result as string;
                        term.write(text);
                    };
                    reader.readAsText(event.data);
                } else {
                    // It might be text if we used send_text
                    term.write(event.data);
                }
            };

            ws.onclose = (event) => {
                // If we are unmounting or it's a stale connection, ignore
                if (ws !== wsRef.current) return;

                setIsConnected(false);
                // 1000: Normal Closure, 1001: Going Away, 1005: No Status
                if (event.code !== 1000 && event.code !== 1001 && event.code !== 1005) {
                    console.warn("[SystemTerminal] Closed abnormally:", event.code, event.reason);
                    term.write(`\r\n\x1b[31m> Connection closed (Code: ${event.code}).\x1b[0m\r\n`);
                }
            };

            ws.onerror = (err) => {
                if (ws !== wsRef.current) return;
                // Don't show error if readyState is CLOSED/CLOSING (intentional close)
                if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) return;

                console.error("WS Error", err);
                term.write('\r\n\x1b[31m> Connection error.\x1b[0m\r\n');
            };

        } catch (e) {
            console.error(e);
            term.write(`\r\n\x1b[31m> Failed to connect: ${e}\x1b[0m\r\n`);
        }
    };

    // Update theme dynamically
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.options.theme = resolvedTheme === 'dark' ? darkTheme : lightTheme;
        }
    }, [resolvedTheme]);

    // Refit when active
    useEffect(() => {
        if (isActive && fitAddonRef.current) {
            requestAnimationFrame(() => {
                fitAddonRef.current?.fit();
            });
        }
    }, [isActive]);

    return (
        <div className="flex flex-col w-full h-full bg-white dark:bg-[#0a0c10] overflow-hidden">
            {/* Terminal Toolbar */}
            <div className="flex items-center justify-between px-3 h-9 border-b border-border/40 bg-muted/10 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500 animate-pulse'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                        Sistem Terminali {isConnected ? '(Bağlı)' : '(Bağlantı Yok)'}
                    </span>
                </div>
                <button
                    onClick={() => {
                        if (wsRef.current) wsRef.current.close();
                        if (terminalRef.current) connect(terminalRef.current);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all border ${isConnected
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/20'
                        : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20'}`}
                    title={isConnected ? "Bağlantıyı Yenile" : "Yeniden Bağlan"}
                >
                    <RefreshCw className={`h-3 w-3 ${isConnected ? '' : 'animate-spin-slow'}`} />
                    {isConnected ? 'YENİLE' : 'BAĞLAN'}
                </button>
            </div>

            {/* Terminal Container */}
            <div className="flex-1 min-h-0 w-full pl-2 pt-1" ref={containerRef} />
        </div>
    );
}
