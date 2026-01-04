import React from 'react';
import { Database, Play, Square, Files, Code2 } from 'lucide-react';
import { ConnectionStatus, ViewMode } from './types';
import { Button } from "@/components/button";
import { Separator } from "@/components/separator";
import { ModeToggle } from "@/components/mode-toggle";

interface HeaderProps {
    wsStatus: ConnectionStatus;
    viewMode: ViewMode;
    isRunning: boolean;
    onViewModeChange: (mode: ViewMode) => void;
    onRunCode: () => void;
    onInterruptCode: () => void;
}

export function Header({ wsStatus, viewMode, isRunning, onViewModeChange, onRunCode, onInterruptCode }: HeaderProps) {
    return (
        <header className="flex h-12 items-center justify-between border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 z-50">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 font-semibold tracking-tight text-sm">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
                        <Database className="h-4 w-4" />
                    </div>
                    <span className="hidden sm:inline-block opacity-90">DataStudio</span>
                </div>

                <Separator orientation="vertical" className="h-4 opacity-50" />

                <div className="flex items-center gap-1">
                    <Button
                        variant={viewMode === 'explorer' ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => onViewModeChange('explorer')}
                        className={`h-7 w-7 p-0 ${viewMode === 'explorer' ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground'}`}
                        title="Dosya Gezgini"
                    >
                        <Files className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'editor' ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => onViewModeChange('editor')}
                        className={`h-7 w-7 p-0 ${viewMode === 'editor' ? 'bg-secondary text-secondary-foreground shadow-sm' : 'text-muted-foreground'}`}
                        title="Kod Editörü"
                    >
                        <Code2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
                    <div className={`h-2 w-2 rounded-full transition-all duration-500 ${wsStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-destructive animate-pulse'}`} />
                    <span className="hidden md:inline-block font-medium opacity-80">{wsStatus === 'connected' ? 'Kernel Hazır' : 'Bağlanıyor...'}</span>
                </div>

                <div className="h-4 w-[1px] bg-border/50 mx-1" />

                <ModeToggle />

                <Button
                    size="sm"
                    onClick={isRunning ? onInterruptCode : onRunCode}
                    variant={isRunning ? "destructive" : "default"}
                    className={`h-7 px-3 gap-2 text-xs font-medium transition-all shadow-sm ${isRunning ? 'animate-pulse' : 'hover:shadow-md hover:bg-primary/90'}`}
                >
                    {isRunning ? <Square className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                    {isRunning ? 'Durdur' : 'Çalıştır'}
                </Button>
            </div>
        </header>
    );
}
