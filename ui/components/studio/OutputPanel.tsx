import React from 'react';
import { RefreshCw, Table2, ArrowUpRight, Database, Download, Clock, CheckCircle2 } from 'lucide-react';
import { TabType, LogEntry, TableData, ConnectionStatus } from './types';
import { ConsoleView } from './ConsoleView';
import { SystemTerminal } from './SystemTerminal';
import { DataGrid } from './DataGrid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { Button } from "@/components/button";

interface OutputPanelProps {
    activeTab: TabType;
    availableTables: string[];
    isRefreshingSchema: boolean;
    logs: LogEntry[];
    activeTable: TableData | null;
    isRunning: boolean;
    onTabChange: (tab: TabType) => void;
    onRefreshSchema: () => void;
    onTerminalCommand: (cmd: string) => void;
    status: ConnectionStatus;
    onConnect: () => void;
    onDisconnect: () => void;
    onRestart: () => void;
    hasError?: boolean;
}

export function OutputPanel({
    activeTab,
    availableTables,
    isRefreshingSchema,
    logs,
    activeTable,
    isRunning,
    onTabChange,
    onRefreshSchema,
    onTerminalCommand,
    status,
    onConnect,
    onDisconnect,
    onRestart,
    hasError
}: OutputPanelProps) {



    return (
        <div className="flex flex-col w-full h-full bg-white dark:bg-[#0a0c10] backdrop-blur-md">
            <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabType)} className="flex flex-col h-full">
                <div className="flex items-center justify-between h-9 border-b border-border/40 bg-muted/10 backdrop-blur-sm shrink-0">
                    <TabsList className="bg-transparent h-9 gap-0 p-0 rounded-none">
                        <TabsTrigger
                            value="logs"
                            className={`h-9 px-4 text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-background/40 rounded-none leading-none bg-transparent hover:text-foreground/80 border-none shadow-none relative data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] cursor-pointer ${hasError ? 'text-red-500 data-[state=active]:after:bg-red-500' : 'data-[state=active]:text-emerald-500 data-[state=active]:after:bg-emerald-500'}`}
                        >
                            Konsol
                        </TabsTrigger>
                        <TabsTrigger
                            value="terminal"
                            className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:text-emerald-500 data-[state=active]:bg-background/40 rounded-none leading-none bg-transparent hover:text-foreground/80 border-none shadow-none relative data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-emerald-500 cursor-pointer"
                        >
                            Terminal
                        </TabsTrigger>
                        <TabsTrigger
                            value="table"
                            className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:text-emerald-500 data-[state=active]:bg-background/40 rounded-none leading-none bg-transparent hover:text-foreground/80 border-none shadow-none relative data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-emerald-500 cursor-pointer"
                        >
                            Veri Akışı
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-2 px-3">
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <TabsContent value="table" className="flex-1 min-h-0 m-0 flex flex-col outline-none ring-0 overflow-hidden">
                        {activeTable ? (
                            <>
                                <div className="flex items-center justify-between px-3 h-9 border-b border-border/40 bg-muted/10 backdrop-blur-sm shrink-0">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                                                <Table2 className="h-3 w-3" />
                                                {activeTable.data.length.toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="h-4 w-[1px] bg-border/40" />

                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 font-mono">
                                            <Clock className="h-3 w-3 opacity-60" />
                                            <span>{activeTable.executionTime || "00:00:00.000"}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                    </div>
                                </div>

                                <div className="flex-1 min-h-0 bg-white dark:bg-[#0a0c10]">
                                    <DataGrid tableData={activeTable} />
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground bg-muted/5">
                                <div className="relative flex items-center justify-center group">
                                    <div className={`p-4 rounded-full ${isRunning ? "bg-primary/10" : "bg-muted/20"}`}>
                                        <Database className={`h-8 w-8 stroke-1 transition-all ${isRunning ? "text-primary animate-pulse" : "text-muted-foreground/40"}`} />
                                    </div>
                                    {isRunning && <RefreshCw className="absolute -right-1 -top-1 h-5 w-5 text-primary animate-spin" />}
                                </div>
                                <div className="text-center space-y-1">
                                    <h4 className="font-medium text-foreground text-sm tracking-tight">{isRunning ? "Sorgu İşleniyor..." : "Veri Bekleniyor"}</h4>
                                    <p className="text-xs max-w-[200px] opacity-60">Sonuçları görüntülemek için bir kod bloğu çalıştırın.</p>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="logs" className="flex-1 min-h-0 m-0 bg-white dark:bg-[#0a0c10] text-zinc-400 font-mono text-xs outline-none ring-0 overflow-hidden">
                        <ConsoleView
                            logs={logs}
                            onCommand={onTerminalCommand}
                            status={status}
                            onConnect={onConnect}
                            onDisconnect={onDisconnect}
                            isRunning={isRunning}
                            onRestart={onRestart}
                        />
                    </TabsContent>

                    <TabsContent value="terminal" className="flex-1 min-h-0 m-0 bg-white dark:bg-[#0a0c10] text-zinc-400 font-mono text-xs outline-none ring-0 overflow-hidden">
                        <SystemTerminal isActive={activeTab === 'terminal'} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
