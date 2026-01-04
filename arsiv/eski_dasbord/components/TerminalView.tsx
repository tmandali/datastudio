import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useTheme } from 'next-themes';
import { LogEntry } from './types';

interface TerminalViewProps {
    logs: LogEntry[];
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

export function TerminalView({ logs }: TerminalViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const lastLogIndex = useRef<number>(0);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

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
        const content = (log.content || "").toString().replace(/\n/g, '\r\n');
        term.write(`${time} ${color}${content}\x1b[0m\r\n`);
    };

    // Initial Setup
    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize xterm
        const term = new Terminal({
            theme: resolvedTheme === 'dark' ? darkTheme : lightTheme,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: 12,
            lineHeight: 1.4,
            cursorBlink: true,
            convertEol: true,
            disableStdin: true,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);

        term.open(containerRef.current);
        fitAddon.fit();

        terminalRef.current = term;
        fitAddonRef.current = fitAddon;

        // Banner
        term.write('\x1b[32m> System Ready.\x1b[0m\r\n');

        // Print existing logs
        if (logs.length > 0) {
            logs.forEach(log => writeLog(term, log));
            lastLogIndex.current = logs.length;
            term.scrollToBottom();
        }

        // Resize Observer
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

    // Theme Switcher for existing terminal
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.options.theme = resolvedTheme === 'dark' ? darkTheme : lightTheme;
        }
    }, [resolvedTheme]);

    // Sync logs
    useEffect(() => {
        const term = terminalRef.current;
        if (!term) return;

        if (logs.length < lastLogIndex.current) {
            term.clear();
            term.write('\x1b[32m> Console Cleared.\x1b[0m\r\n');
            lastLogIndex.current = 0;
        }

        const newLogs = logs.slice(lastLogIndex.current);
        if (newLogs.length > 0) {
            newLogs.forEach(log => writeLog(term, log));
            lastLogIndex.current = logs.length;
        }
    }, [logs]);

    return <div className="w-full h-full pl-2 pt-2 bg-white dark:bg-[#0a0c10] outline-none" ref={containerRef} />;
}
