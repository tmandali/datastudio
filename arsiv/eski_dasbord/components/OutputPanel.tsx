import React from 'react';
import { RefreshCw, Table2, ArrowUpRight, Database, Download, Clock, CheckCircle2 } from 'lucide-react';
import { TabType, LogEntry, TableData } from './types';
import { TerminalView } from './TerminalView';
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
}

export function OutputPanel({
    activeTab,
    availableTables,
    isRefreshingSchema,
    logs,
    activeTable,
    isRunning,
    onTabChange,
    onRefreshSchema
}: OutputPanelProps) {

    const handleDownloadCSV = () => {
        if (!activeTable) return;
        const headers = activeTable.columns.join(',');
        const rows = activeTable.data.map(row => activeTable.columns.map(col => `"${row[col]}"`).join(','));
        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'data_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col w-full h-full bg-white dark:bg-[#0a0c10] backdrop-blur-md">
            <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as TabType)} className="flex flex-col h-full">
                <div className="flex items-center justify-between h-10 bg-muted/20 backdrop-blur-md">
                    <TabsList className="bg-transparent h-10 gap-0 p-0">
                        <TabsTrigger
                            value="logs"
                            className="h-10 px-6 text-[11px] uppercase tracking-wider font-bold transition-all data-[state=active]:text-blue-500 data-[state=active]:bg-background/40 rounded-none leading-none bg-transparent dark:hover:text-blue-400 border-none shadow-none relative data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-blue-500 cursor-pointer"
                        >
                            Konsol
                        </TabsTrigger>
                        <TabsTrigger
                            value="table"
                            className="h-10 px-6 text-[11px] uppercase tracking-wider font-bold transition-all data-[state=active]:text-blue-500 data-[state=active]:bg-background/40 rounded-none leading-none bg-transparent dark:hover:text-blue-400 border-none shadow-none relative data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-blue-500 cursor-pointer"
                        >
                            Veri Akışı
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center gap-1">
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    <TabsContent value="table" className="h-full m-0 flex flex-col outline-none ring-0">
                        {activeTable ? (
                            <>
                                <div className="flex items-center justify-between px-3 h-9 border-b border-border/40 bg-background/50 backdrop-blur-sm">
                                    <div className="flex items-center gap-4 text-[11px] font-medium tracking-tight">
                                        <div className="flex items-center gap-1.5 text-emerald-500">
                                            <CheckCircle2 className="h-4 w-4 fill-emerald-500/10" />
                                            <span className="font-bold">{activeTable.data.length}</span>
                                            <span className="text-muted-foreground/70 font-normal">satır</span>
                                        </div>
                                        <div className="h-3 w-[1px] bg-border/40" />
                                        <div className="flex items-center gap-2 text-muted-foreground/80 font-mono">
                                            <Clock className="h-3.5 w-3.5 opacity-60" />
                                            <span>00:00:00.623</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="sm" onClick={handleDownloadCSV} className="h-6 text-[10px] gap-1.5 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                                            <Download className="h-3 w-3" /> CSV İndir
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 bg-white dark:bg-[#0a0c10]">
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

                    <TabsContent value="logs" className="h-full m-0 bg-white dark:bg-[#0a0c10] text-zinc-400 font-mono text-xs outline-none ring-0">
                        <TerminalView logs={logs} />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
