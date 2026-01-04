import React, { useMemo } from 'react';
import { Search, FileCode, Database, Trash2, FilePlus } from 'lucide-react';
import { ProjectFile, LanguageType } from './types';
import { Input } from "@/components/input";
import { ScrollArea } from "@/components/scroll-area";
import { Button } from "@/components/button";

interface ExplorerProps {
    files: ProjectFile[];
    activeFileId: string;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onFileSelect: (id: string) => void;
    onFileDelete: (id: string, e: React.MouseEvent) => void;
    onAddNewFile: (type: LanguageType) => void;
}

export function Explorer({
    files,
    activeFileId,
    searchQuery,
    onSearchChange,
    onFileSelect,
    onFileDelete,
    onAddNewFile
}: ExplorerProps) {

    const filteredFiles = useMemo(() => {
        return files.filter(f =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [files, searchQuery]);

    return (
        <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
            {/* Header Section */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-sidebar-border">
                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Proje Dosyaları</span>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => onAddNewFile('python')} title="Yeni Python Dosyası">
                        <FilePlus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => onAddNewFile('sql')} title="Yeni SQL Dosyası">
                        <Database className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2">
                <div className="relative group">
                    <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                    <Input
                        type="search"
                        placeholder="Ara..."
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                        className="pl-8 h-8 text-xs bg-sidebar-accent/50 border-transparent focus:bg-background focus:border-input transition-all placeholder:text-muted-foreground/60"
                    />
                </div>
            </div>

            {/* File List */}
            <ScrollArea className="flex-1 px-2">
                <div className="space-y-0.5 py-1">
                    {filteredFiles.map(file => (
                        <div
                            key={file.id}
                            className={`
                                group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors
                                ${activeFileId === file.id
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}
                            `}
                            onClick={() => onFileSelect(file.id)}
                        >
                            <div className="flex items-center gap-2 truncate">
                                {file.language === 'python'
                                    ? <FileCode className="h-4 w-4 text-blue-500 opacity-80" />
                                    : <Database className="h-4 w-4 text-orange-500 opacity-80" />
                                }
                                <span className="truncate">{file.name}</span>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-transparent transition-opacity"
                                onClick={(e) => onFileDelete(file.id, e)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}

                    {filteredFiles.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground text-xs italic">
                            Dosya bulunamadı.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
